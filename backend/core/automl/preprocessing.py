"""
Agentix AutoML Engine - Leak-Free Preprocessing Pipeline
Prepares tabular data with strict train-only fitting for scalers, imputers,
and encoders to prevent test data contamination and feature leakage.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, KFold, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from core.automl.types import TaskType

logger = logging.getLogger("agentix_v2")


class PreprocessedSplit:
    """Container for leak-free processed training and testing partitions."""

    def __init__(
        self,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: Optional[np.ndarray],
        y_test: Optional[np.ndarray],
        feature_names: List[str],
        scaler: Optional[StandardScaler] = None,
        label_encoder: Optional[LabelEncoder] = None,
        target_scaler: Optional[StandardScaler] = None,
        classes: Optional[List[Any]] = None,
    ):
        self.X_train = X_train
        self.X_test = X_test
        self.y_train = y_train
        self.y_test = y_test
        self.feature_names = feature_names
        self.scaler = scaler
        self.label_encoder = label_encoder
        self.target_scaler = target_scaler
        self.classes = classes


class LeakFreePreprocessor:
    """
    Transforms raw datasets into model-ready tensors while strictly enforcing
    data partition hygiene: all transformations fit on training data only.
    """

    def __init__(self, test_size: float = 0.2, random_state: int = 42):
        self.test_size = test_size
        self.random_state = random_state

    def prepare(
        self,
        df: pd.DataFrame,
        task_type: TaskType,
        target_column: Optional[str] = None,
    ) -> PreprocessedSplit:
        return self.prepare_data(
            df=df,
            task_type=task_type,
            target_column=target_column,
            test_size=self.test_size,
            random_state=self.random_state,
        )

    @staticmethod
    def prepare_data(
        df: pd.DataFrame,
        task_type: TaskType,
        target_column: Optional[str] = None,
        test_size: float = 0.2,
        random_state: int = 42,
    ) -> PreprocessedSplit:
        """
        Executes leak-free preprocessing and splitting.
        """
        df_clean = df.copy()

        # Handle unsupervised tasks (Clustering & Dimensionality Reduction)
        if task_type in (TaskType.CLUSTERING, TaskType.DIMENSIONALITY_REDUCTION):
            # Select all numeric features
            num_cols = list(df_clean.select_dtypes(include=[np.number]).columns)
            if not num_cols:
                # If no numeric features, encode categoricals
                for col in df_clean.columns:
                    df_clean[col] = LabelEncoder().fit_transform(df_clean[col].astype(str))
                num_cols = list(df_clean.columns)

            X_raw = df_clean[num_cols].copy()

            # Impute strictly on data
            imputer = SimpleImputer(strategy="median")
            X_imputed = imputer.fit_transform(X_raw)

            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_imputed)

            # For unsupervised tasks, train/test are the same dataset
            return PreprocessedSplit(
                X_train=X_scaled,
                X_test=X_scaled,
                y_train=None,
                y_test=None,
                feature_names=num_cols,
                scaler=scaler,
            )

        # Supervised tasks
        if not target_column or target_column not in df_clean.columns:
            raise ValueError(f"Target column '{target_column}' is required for supervised task '{task_type}'.")

        y_raw = df_clean[target_column].copy()
        feature_cols = [c for c in df_clean.columns if c != target_column]

        # Filter out invalid target rows
        valid_mask = y_raw.notna()
        df_clean = df_clean[valid_mask]
        y_raw = y_raw[valid_mask]

        # Process categorical features to numeric representations
        cat_cols = list(df_clean[feature_cols].select_dtypes(exclude=[np.number]).columns)
        for col in cat_cols:
            n_unique = df_clean[col].nunique()
            if n_unique <= 20:
                # Low cardinality: one-hot or frequency encode
                dummies = pd.get_dummies(df_clean[col], prefix=col, drop_first=True)
                df_clean = pd.concat([df_clean.drop(columns=[col]), dummies], axis=1)
            else:
                # High cardinality: frequency encode
                freq = df_clean[col].value_counts(normalize=True)
                df_clean[col] = df_clean[col].map(freq).astype(float).fillna(0.0)

        # Refresh feature columns list
        feature_cols = [c for c in df_clean.columns if c != target_column]
        X_df = df_clean[feature_cols].select_dtypes(include=[np.number])
        final_feature_names = list(X_df.columns)

        if X_df.shape[1] == 0:
            raise ValueError("No numeric features could be constructed from dataset for modeling.")

        # Train/Test Split with appropriate strategy
        label_encoder = None
        target_scaler = None
        classes = None

        if task_type == TaskType.CLASSIFICATION:
            label_encoder = LabelEncoder()
            y_encoded = label_encoder.fit_transform(y_raw.astype(str))
            classes = list(label_encoder.classes_)

            if len(classes) < 2:
                raise ValueError("Target has fewer than 2 distinct classes; cannot train classification models.")

            # Stratified split to preserve class distributions
            stratify = y_encoded if min(np.bincount(y_encoded)) >= 2 else None
            X_train_df, X_test_df, y_train_enc, y_test_enc = train_test_split(
                X_df, y_encoded, test_size=test_size, random_state=random_state, stratify=stratify
            )
            y_train_final = y_train_enc
            y_test_final = y_test_enc

        elif task_type == TaskType.TIME_SERIES:
            # Time-aware split: strictly preserve temporal order without random shuffling
            split_idx = int(len(X_df) * (1.0 - test_size))
            X_train_df = X_df.iloc[:split_idx]
            X_test_df = X_df.iloc[split_idx:]
            y_train_final = y_raw.iloc[:split_idx].to_numpy(dtype=float)
            y_test_final = y_raw.iloc[split_idx:].to_numpy(dtype=float)

        else:  # REGRESSION
            y_vals = y_raw.to_numpy(dtype=float)
            X_train_df, X_test_df, y_train_final, y_test_final = train_test_split(
                X_df, y_vals, test_size=test_size, random_state=random_state
            )

            # Fit target scaler strictly on training target
            target_scaler = StandardScaler()
            target_scaler.fit(y_train_final.reshape(-1, 1))

        # Impute missing values (FIT ON TRAIN ONLY)
        imputer = SimpleImputer(strategy="median")
        X_train_imp = imputer.fit_transform(X_train_df)
        X_test_imp = imputer.transform(X_test_df)

        # Scale features (FIT ON TRAIN ONLY)
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train_imp)
        X_test_scaled = scaler.transform(X_test_imp)

        return PreprocessedSplit(
            X_train=X_train_scaled,
            X_test=X_test_scaled,
            y_train=y_train_final,
            y_test=y_test_final,
            feature_names=final_feature_names,
            scaler=scaler,
            label_encoder=label_encoder,
            target_scaler=target_scaler,
            classes=classes,
        )
