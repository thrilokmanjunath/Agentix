"""
Agentix AutoML Engine - Algorithm Registry
Central catalog of all available machine learning, clustering, decomposition,
and time-series algorithms with instantiated factory constructors and metadata.
"""

import logging
from typing import Any, Callable, Dict, List, Optional, Tuple
from core.automl.types import (
    AlgorithmMetadata,
    AlgorithmTier,
    ComplexityRating,
    InterpretabilityRating,
    TaskType,
)

logger = logging.getLogger("agentix_v2")

# Check optional libraries
try:
    import umap
    UMAP_AVAILABLE = True
except Exception:
    UMAP_AVAILABLE = False

try:
    from lightgbm import LGBMClassifier, LGBMRegressor
    LIGHTGBM_AVAILABLE = True
except Exception:
    LIGHTGBM_AVAILABLE = False

try:
    from xgboost import XGBClassifier, XGBRegressor
    XGBOOST_AVAILABLE = True
except Exception:
    XGBOOST_AVAILABLE = False

try:
    from catboost import CatBoostClassifier, CatBoostRegressor
    CATBOOST_AVAILABLE = True
except Exception:
    CATBOOST_AVAILABLE = False


class AlgorithmRegistry:
    """
    Authoritative registry of machine learning algorithms for Agentix AutoML.
    Provides metadata, factory constructors, and compatibility checks.
    """

    def __init__(self):
        self._algorithms: Dict[str, Tuple[AlgorithmMetadata, Callable[..., Any]]] = {}
        self._register_all()

    def register(
        self,
        metadata: AlgorithmMetadata,
        factory: Callable[..., Any],
    ) -> None:
        self._algorithms[metadata.id] = (metadata, factory)

    def get_metadata(self, algorithm_id: str) -> Optional[AlgorithmMetadata]:
        entry = self._algorithms.get(algorithm_id)
        return entry[0] if entry else None

    def create_instance(self, algorithm_id: str, **kwargs) -> Any:
        entry = self._algorithms.get(algorithm_id)
        if not entry:
            raise ValueError(f"Algorithm '{algorithm_id}' is not registered in Agentix AutoML.")
        metadata, factory = entry
        return factory(**kwargs)

    def list_by_task(self, task_type: TaskType) -> List[AlgorithmMetadata]:
        return [
            meta for meta, _ in self._algorithms.values()
            if meta.task_type == task_type and meta.is_available
        ]

    def get_all(self) -> List[AlgorithmMetadata]:
        return [meta for meta, _ in self._algorithms.values() if meta.is_available]

    def list_all(self) -> List[AlgorithmMetadata]:
        return self.get_all()

    def _register_all(self) -> None:
        # =========================================================================
        # CLASSIFICATION ALGORITHMS
        # =========================================================================

        # 1. Logistic Regression
        def make_logistic_regression(**kwargs):
            from sklearn.linear_model import LogisticRegression
            params = {"max_iter": 1000, "random_state": 42, "solver": "lbfgs"}
            params.update(kwargs)
            return LogisticRegression(**params)

        self.register(
            AlgorithmMetadata(
                id="logistic_regression",
                name="Logistic Regression",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.LINEAR,
                description="Regularized linear classification model using the logistic sigmoid function.",
                pros=["Fast convergence", "Probabilistic outputs", "Highly interpretable coefficients"],
                cons=["Assumes linear log-odds relationship", "Sensitive to outliers and multicollinearity"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_logistic_regression,
        )

        # 2. Decision Tree Classifier
        def make_decision_tree_clf(**kwargs):
            from sklearn.tree import DecisionTreeClassifier
            params = {"max_depth": 10, "min_samples_split": 5, "random_state": 42}
            params.update(kwargs)
            return DecisionTreeClassifier(**params)

        self.register(
            AlgorithmMetadata(
                id="decision_tree",
                name="Decision Tree",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.TREE,
                description="Non-parametric hierarchical partitioning tree with orthogonal decision boundaries.",
                pros=["Captures non-linear thresholds", "Visualizable rules", "Invariant to feature scaling"],
                cons=["High variance", "Prone to severe overfitting without depth pruning"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=False,
                speed_tier="Fast",
            ),
            make_decision_tree_clf,
        )

        # 3. Random Forest Classifier
        def make_random_forest_clf(**kwargs):
            from sklearn.ensemble import RandomForestClassifier
            params = {"n_estimators": 100, "max_depth": 15, "random_state": 42, "n_jobs": -1}
            params.update(kwargs)
            return RandomForestClassifier(**params)

        self.register(
            AlgorithmMetadata(
                id="random_forest",
                name="Random Forest",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.ENSEMBLE,
                description="Bootstrap aggregation ensemble of decorrelated decision trees with feature subsampling.",
                pros=["High generalization stability", "Resistant to overfitting", "Accurate Gini feature importances"],
                cons=["Larger model memory footprint", "Slower inference than single linear models"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=False,
                speed_tier="Moderate",
            ),
            make_random_forest_clf,
        )

        # 4. Extra Trees Classifier
        def make_extra_trees_clf(**kwargs):
            from sklearn.ensemble import ExtraTreesClassifier
            params = {"n_estimators": 100, "max_depth": 15, "random_state": 42, "n_jobs": -1}
            params.update(kwargs)
            return ExtraTreesClassifier(**params)

        self.register(
            AlgorithmMetadata(
                id="extra_trees",
                name="Extra Trees",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.ENSEMBLE,
                description="Extremely randomized ensemble trees with randomized threshold selection for reduced variance.",
                pros=["Faster tree construction than standard Random Forest", "Lower variance", "Effective on noisy features"],
                cons=["Slightly higher bias on complex boundaries", "Memory footprint scales with estimator count"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=False,
                speed_tier="Fast",
            ),
            make_extra_trees_clf,
        )

        # 5. SGD Classifier
        def make_sgd_clf(**kwargs):
            from sklearn.linear_model import SGDClassifier
            params = {"loss": "log_loss", "max_iter": 1000, "random_state": 42, "tol": 1e-3}
            params.update(kwargs)
            return SGDClassifier(**params)

        self.register(
            AlgorithmMetadata(
                id="sgd_classifier",
                name="SGD Classifier",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.LINEAR,
                description="Linear classification trained via Stochastic Gradient Descent with partial_fit streaming.",
                pros=["Memory footprint O(1)", "Scales to datasets larger than RAM", "Ultra-low training latency"],
                cons=["Hyper-sensitive to feature scaling", "Requires careful learning rate tuning"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_sgd_clf,
        )

        # 6. Support Vector Machine (Linear & Kernel)
        def make_svm_clf(**kwargs):
            from sklearn.svm import LinearSVC
            from sklearn.calibration import CalibratedClassifierCV
            params = {"random_state": 42, "dual": False, "max_iter": 2000}
            params.update(kwargs)
            base = LinearSVC(**params)
            return CalibratedClassifierCV(estimator=base, cv=3)

        self.register(
            AlgorithmMetadata(
                id="svm",
                name="Support Vector Machine (Linear SVM)",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.GEOMETRIC,
                description="Maximum-margin hyper-plane classifier calibrated with isotonic regression for probabilities.",
                pros=["Effective in high-dimensional spaces (P > N)", "Robust against overfitting in sparse domains"],
                cons=["Training scales poorly with huge row counts", "Requires explicit probability calibration"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=True,
                speed_tier="Moderate",
            ),
            make_svm_clf,
        )

        # 7. K-Nearest Neighbors Classifier
        def make_knn_clf(**kwargs):
            from sklearn.neighbors import KNeighborsClassifier
            params = {"n_neighbors": 5, "weights": "distance", "n_jobs": -1}
            params.update(kwargs)
            return KNeighborsClassifier(**params)

        self.register(
            AlgorithmMetadata(
                id="knn",
                name="K-Nearest Neighbors",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.NEIGHBORS,
                description="Instance-based non-parametric classifier using local Euclidean metric neighborhoods.",
                pros=["No training assumption", "Naturally models complex multi-modal decision boundaries"],
                cons=["Inference is O(N) per query", "Curse of dimensionality deteriorates distance metrics"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_SQUARED,
                requires_scaling=True,
                speed_tier="Moderate",
            ),
            make_knn_clf,
        )

        # 8. Gaussian Naive Bayes
        def make_gaussian_nb(**kwargs):
            from sklearn.naive_bayes import GaussianNB
            return GaussianNB(**kwargs)

        self.register(
            AlgorithmMetadata(
                id="gaussian_nb",
                name="Gaussian Naive Bayes",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.NAIVE_BAYES,
                description="Probabilistic classifier assuming class-conditional feature independence with normal distributions.",
                pros=["Zero hyperparameter tuning required", "Blazing execution speed", "Excellent baseline"],
                cons=["Strong feature independence assumption rarely holds strictly in empirical data"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=False,
                speed_tier="Ultra-Fast",
            ),
            make_gaussian_nb,
        )

        # 9. Gradient Boosting Classifier
        def make_gradient_boosting_clf(**kwargs):
            from sklearn.ensemble import GradientBoostingClassifier
            params = {"n_estimators": 100, "learning_rate": 0.1, "max_depth": 4, "random_state": 42}
            params.update(kwargs)
            return GradientBoostingClassifier(**params)

        self.register(
            AlgorithmMetadata(
                id="gradient_boosting",
                name="Gradient Boosting",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.BOOSTING,
                description="Sequential additive ensemble minimizing exponential log-loss using steepest descent pseudo-residuals.",
                pros=["State-of-the-art predictive accuracy on tabular data", "Strong non-linear feature interaction capture"],
                cons=["Sequential training cannot be fully parallelized", "Sensitive to noisy label outliers"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=False,
                speed_tier="Moderate",
            ),
            make_gradient_boosting_clf,
        )

        # 10. HistGradientBoosting Classifier
        def make_hist_gb_clf(**kwargs):
            from sklearn.ensemble import HistGradientBoostingClassifier
            params = {"max_iter": 100, "learning_rate": 0.1, "max_depth": 8, "random_state": 42}
            params.update(kwargs)
            return HistGradientBoostingClassifier(**params)

        self.register(
            AlgorithmMetadata(
                id="hist_gradient_boosting",
                name="HistGradientBoosting",
                task_type=TaskType.CLASSIFICATION,
                tier=AlgorithmTier.BOOSTING,
                description="Histogram-binned gradient boosting algorithm inspired by LightGBM for orders-of-magnitude faster training.",
                pros=["Built-in missing value handling", "Fast training on large datasets", "Native categorical support"],
                cons=["Histogram binning can discretize subtle continuous transitions in tiny samples"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=False,
                handles_missing_natively=True,
                speed_tier="Fast",
            ),
            make_hist_gb_clf,
        )

        # 11. LightGBM (if available)
        if LIGHTGBM_AVAILABLE:
            def make_lgbm_clf(**kwargs):
                params = {"n_estimators": 100, "learning_rate": 0.05, "random_state": 42, "verbose": -1, "n_jobs": -1}
                params.update(kwargs)
                return LGBMClassifier(**params)

            self.register(
                AlgorithmMetadata(
                    id="lightgbm",
                    name="LightGBM Classifier",
                    task_type=TaskType.CLASSIFICATION,
                    tier=AlgorithmTier.BOOSTING,
                    description="High-performance leaf-wise gradient boosting framework using histogram-based algorithms.",
                    pros=["Blazing fast", "Lowest memory usage among boosting engines", "Handles large datasets"],
                    cons=["Leaf-wise tree growth can overfit without min_data_in_leaf constraint"],
                    interpretability=InterpretabilityRating.MEDIUM,
                    computational_complexity=ComplexityRating.O_N,
                    requires_scaling=False,
                    handles_missing_natively=True,
                    speed_tier="Ultra-Fast",
                ),
                make_lgbm_clf,
            )

        # =========================================================================
        # REGRESSION ALGORITHMS
        # =========================================================================

        # 1. Linear Regression
        def make_linear_regression(**kwargs):
            from sklearn.linear_model import LinearRegression
            return LinearRegression(**kwargs)

        self.register(
            AlgorithmMetadata(
                id="linear_regression",
                name="Linear Regression",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.LINEAR,
                description="Ordinary Least Squares (OLS) linear regression estimating closed-form parameter weights.",
                pros=["Analytically optimal closed-form solution", "Direct coefficient interpretation", "Zero tuning"],
                cons=["Prone to severe numerical instability on collinear features", "Cannot capture non-linear trends"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_linear_regression,
        )

        # 2. Ridge Regression (L2)
        def make_ridge(**kwargs):
            from sklearn.linear_model import Ridge
            params = {"alpha": 1.0, "random_state": 42}
            params.update(kwargs)
            return Ridge(**params)

        self.register(
            AlgorithmMetadata(
                id="ridge",
                name="Ridge Regression (L2)",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.LINEAR,
                description="Linear regression with Tikhonov L2 regularisation penalty on coefficient norms.",
                pros=["Guarantees matrix invertibility", "Stabilizes multicollinearity", "Prevents exploding weights"],
                cons=["Does not induce sparsity (keeps all features)"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_ridge,
        )

        # 3. Lasso Regression (L1)
        def make_lasso(**kwargs):
            from sklearn.linear_model import Lasso
            params = {"alpha": 0.1, "max_iter": 2000, "random_state": 42}
            params.update(kwargs)
            return Lasso(**params)

        self.register(
            AlgorithmMetadata(
                id="lasso",
                name="Lasso Regression (L1)",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.LINEAR,
                description="Linear regression with L1 regularisation penalty producing automatic feature selection.",
                pros=["Induces sparse solutions (drives irrelevant coefficients to zero)", "Built-in feature elimination"],
                cons=["Selects at most N features when P > N", "Can arbitrarily pick one of correlated features"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Fast",
            ),
            make_lasso,
        )

        # 4. ElasticNet Regression (L1 + L2)
        def make_elastic_net(**kwargs):
            from sklearn.linear_model import ElasticNet
            params = {"alpha": 0.1, "l1_ratio": 0.5, "max_iter": 2000, "random_state": 42}
            params.update(kwargs)
            return ElasticNet(**params)

        self.register(
            AlgorithmMetadata(
                id="elastic_net",
                name="ElasticNet",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.LINEAR,
                description="Convex combination of L1 and L2 regularisation penalties balancing sparsity and group selection.",
                pros=["Handles correlated feature clusters effectively", "Robust when P > N"],
                cons=["Requires simultaneous tuning of alpha and l1_ratio"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Fast",
            ),
            make_elastic_net,
        )

        # 5. Decision Tree Regressor
        def make_decision_tree_reg(**kwargs):
            from sklearn.tree import DecisionTreeRegressor
            params = {"max_depth": 10, "min_samples_split": 5, "random_state": 42}
            params.update(kwargs)
            return DecisionTreeRegressor(**params)

        self.register(
            AlgorithmMetadata(
                id="decision_tree_regressor",
                name="Decision Tree Regressor",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.TREE,
                description="Piecewise constant regression tree partitioning continuous feature space into orthogonal leaves.",
                pros=["Simple non-linear model", "Scale-invariant", "Visualizable partition logic"],
                cons=["Step-function predictions cannot extrapolate outside training domain boundaries"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=False,
                speed_tier="Fast",
            ),
            make_decision_tree_reg,
        )

        # 6. Random Forest Regressor
        def make_random_forest_reg(**kwargs):
            from sklearn.ensemble import RandomForestRegressor
            params = {"n_estimators": 100, "max_depth": 15, "random_state": 42, "n_jobs": -1}
            params.update(kwargs)
            return RandomForestRegressor(**params)

        self.register(
            AlgorithmMetadata(
                id="random_forest_regressor",
                name="Random Forest Regressor",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.ENSEMBLE,
                description="Averaging ensemble of randomized regression trees with low variance and strong generalization.",
                pros=["High empirical accuracy", "Robust to outliers", "Non-linear interaction modeling"],
                cons=["Cannot extrapolate linear trends outside observed target bounds", "Inference requires multiple tree traversals"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=False,
                speed_tier="Moderate",
            ),
            make_random_forest_reg,
        )

        # 7. Extra Trees Regressor
        def make_extra_trees_reg(**kwargs):
            from sklearn.ensemble import ExtraTreesRegressor
            params = {"n_estimators": 100, "max_depth": 15, "random_state": 42, "n_jobs": -1}
            params.update(kwargs)
            return ExtraTreesRegressor(**params)

        self.register(
            AlgorithmMetadata(
                id="extra_trees_regressor",
                name="Extra Trees Regressor",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.ENSEMBLE,
                description="Extremely randomized regression trees selecting random cut-points for further variance reduction.",
                pros=["Faster fit than standard Random Forest", "Smoother regression surfaces"],
                cons=["Requires more trees to stabilize predictions"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=False,
                speed_tier="Fast",
            ),
            make_extra_trees_reg,
        )

        # 8. Gradient Boosting Regressor
        def make_gradient_boosting_reg(**kwargs):
            from sklearn.ensemble import GradientBoostingRegressor
            params = {"n_estimators": 100, "learning_rate": 0.1, "max_depth": 4, "random_state": 42}
            params.update(kwargs)
            return GradientBoostingRegressor(**params)

        self.register(
            AlgorithmMetadata(
                id="gradient_boosting_regressor",
                name="Gradient Boosting Regressor",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.BOOSTING,
                description="Sequential additive regression fitting trees to continuous negative squared-error gradients.",
                pros=["Consistently among top performers on tabular benchmarks", "Flexible loss functions (Huber, Quantile)"],
                cons=["Sequential training cannot be fully parallelized across trees"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=False,
                speed_tier="Moderate",
            ),
            make_gradient_boosting_reg,
        )

        # 9. HistGradientBoosting Regressor
        def make_hist_gb_reg(**kwargs):
            from sklearn.ensemble import HistGradientBoostingRegressor
            params = {"max_iter": 100, "learning_rate": 0.1, "max_depth": 8, "random_state": 42}
            params.update(kwargs)
            return HistGradientBoostingRegressor(**params)

        self.register(
            AlgorithmMetadata(
                id="hist_gradient_boosting_regressor",
                name="HistGradientBoosting Regressor",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.BOOSTING,
                description="Histogram-binned gradient booster optimized for rapid continuous value fitting and missing data.",
                pros=["Handles missing values natively", "High execution speed", "Scales to 100K+ rows seamlessly"],
                cons=["Quantization into 256 bins may lose minute precision in tiny datasets"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=False,
                handles_missing_natively=True,
                speed_tier="Fast",
            ),
            make_hist_gb_reg,
        )

        # 10. SGD Regressor
        def make_sgd_reg(**kwargs):
            from sklearn.linear_model import SGDRegressor
            params = {"max_iter": 1000, "random_state": 42, "tol": 1e-3}
            params.update(kwargs)
            return SGDRegressor(**params)

        self.register(
            AlgorithmMetadata(
                id="sgd_regressor",
                name="SGD Regressor",
                task_type=TaskType.REGRESSION,
                tier=AlgorithmTier.LINEAR,
                description="Stochastic gradient descent linear regressor supporting online partial_fit data streams.",
                pros=["Constant memory footprint", "Scales to multi-gigabyte datasets", "Sub-second training"],
                cons=["Highly sensitive to unscaled targets and features", "Prone to divergent gradients if unnormalized"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_sgd_reg,
        )

        # =========================================================================
        # CLUSTERING ALGORITHMS
        # =========================================================================

        # 1. K-Means
        def make_kmeans(**kwargs):
            from sklearn.cluster import KMeans
            params = {"n_clusters": kwargs.get("n_clusters", 3), "random_state": 42, "n_init": "auto"}
            return KMeans(**params)

        self.register(
            AlgorithmMetadata(
                id="kmeans",
                name="K-Means",
                task_type=TaskType.CLUSTERING,
                tier=AlgorithmTier.GEOMETRIC,
                description="Centroid-based partition clustering minimizing intra-cluster sum-of-squares (inertia).",
                pros=["Fast convergence with Lloyd's algorithm", "Well-defined geometric centroids", "Scalable"],
                cons=["Assumes spherical, isotropic clusters of similar sizes", "Sensitive to random initial seed"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_kmeans,
        )

        # 2. MiniBatch K-Means
        def make_minibatch_kmeans(**kwargs):
            from sklearn.cluster import MiniBatchKMeans
            params = {"n_clusters": kwargs.get("n_clusters", 3), "batch_size": 256, "random_state": 42, "n_init": "auto"}
            return MiniBatchKMeans(**params)

        self.register(
            AlgorithmMetadata(
                id="minibatch_kmeans",
                name="MiniBatch K-Means",
                task_type=TaskType.CLUSTERING,
                tier=AlgorithmTier.GEOMETRIC,
                description="Mini-batch stochastic approximation of K-Means achieving 10x-100x speedup on massive data.",
                pros=["Orders of magnitude faster than standard K-Means", "O(batch_size) memory footprint"],
                cons=["Slightly higher final inertia than batch Lloyd's algorithm"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_minibatch_kmeans,
        )

        # 3. DBSCAN
        def make_dbscan(**kwargs):
            from sklearn.cluster import DBSCAN
            params = {"eps": kwargs.get("eps", 0.5), "min_samples": kwargs.get("min_samples", 5), "n_jobs": -1}
            return DBSCAN(**params)

        self.register(
            AlgorithmMetadata(
                id="dbscan",
                name="DBSCAN",
                task_type=TaskType.CLUSTERING,
                tier=AlgorithmTier.GEOMETRIC,
                description="Density-based spatial clustering identifying core samples, arbitrary shapes, and noise outliers.",
                pros=["Discovers arbitrary non-convex cluster shapes", "Automatic cluster count", "Explicit noise rejection"],
                cons=["Sensitive to eps radius distance scale", "Struggles with variable density clusters"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=True,
                speed_tier="Fast",
            ),
            make_dbscan,
        )

        # 4. Agglomerative Clustering
        def make_agglomerative(**kwargs):
            from sklearn.cluster import AgglomerativeClustering
            params = {"n_clusters": kwargs.get("n_clusters", 3)}
            return AgglomerativeClustering(**params)

        self.register(
            AlgorithmMetadata(
                id="agglomerative",
                name="Agglomerative Clustering",
                task_type=TaskType.CLUSTERING,
                tier=AlgorithmTier.GEOMETRIC,
                description="Hierarchical bottom-up cluster merging constructing a nested dendrogram of sample proximities.",
                pros=["Captures hierarchical taxonomy", "Deterministic merging", "No centroid assumption"],
                cons=["O(N^2) memory distance matrix makes it unsuitable for datasets with N > 15,000"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N_SQUARED,
                requires_scaling=True,
                speed_tier="Moderate",
            ),
            make_agglomerative,
        )

        # 5. Gaussian Mixture Models
        def make_gmm(**kwargs):
            from sklearn.mixture import GaussianMixture
            params = {"n_components": kwargs.get("n_clusters", 3), "random_state": 42}
            return GaussianMixture(**params)

        self.register(
            AlgorithmMetadata(
                id="gaussian_mixture",
                name="Gaussian Mixture Models (GMM)",
                task_type=TaskType.CLUSTERING,
                tier=AlgorithmTier.GEOMETRIC,
                description="Probabilistic soft-clustering model fitting a mixture of multi-variate Gaussian ellipsoids via EM.",
                pros=["Soft probabilistic cluster assignment", "Accommodates non-spherical elliptical covariance"],
                cons=["Expectation-Maximization can get trapped in local likelihood maxima"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Fast",
            ),
            make_gmm,
        )

        # =========================================================================
        # DIMENSIONALITY REDUCTION ALGORITHMS
        # =========================================================================

        # 1. PCA
        def make_pca(**kwargs):
            from sklearn.decomposition import PCA
            params = {"n_components": kwargs.get("n_components", 2), "random_state": 42}
            return PCA(**params)

        self.register(
            AlgorithmMetadata(
                id="pca",
                name="Principal Component Analysis (PCA)",
                task_type=TaskType.DIMENSIONALITY_REDUCTION,
                tier=AlgorithmTier.DECOMPOSITION,
                description="Linear orthogonal projection maximizing the explained variance along eigenvectors.",
                pros=["Maximizes preserved variance", "Unsupervised and deterministic", "Fast SVD solver"],
                cons=["Strictly linear projection (misses manifold curves)", "Sensitive to feature scale disparities"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_pca,
        )

        # 2. Truncated SVD
        def make_truncated_svd(**kwargs):
            from sklearn.decomposition import TruncatedSVD
            params = {"n_components": kwargs.get("n_components", 2), "random_state": 42}
            return TruncatedSVD(**params)

        self.register(
            AlgorithmMetadata(
                id="truncated_svd",
                name="Truncated SVD",
                task_type=TaskType.DIMENSIONALITY_REDUCTION,
                tier=AlgorithmTier.DECOMPOSITION,
                description="Singular Value Decomposition factoring sparse matrix representations without dense centering.",
                pros=["Operates directly on scipy.sparse matrices without memory blowup", "Ideal for TF-IDF / one-hot embeddings"],
                cons=["Does not subtract empirical mean, so variance interpretations differ slightly from centered PCA"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N,
                supports_sparse=True,
                requires_scaling=False,
                speed_tier="Ultra-Fast",
            ),
            make_truncated_svd,
        )

        # 3. t-SNE
        def make_tsne(**kwargs):
            from sklearn.manifold import TSNE
            params = {"n_components": 2, "random_state": 42, "perplexity": min(30.0, kwargs.get("perplexity", 30.0))}
            return TSNE(**params)

        self.register(
            AlgorithmMetadata(
                id="tsne",
                name="t-Distributed Stochastic Neighbor Embedding (t-SNE)",
                task_type=TaskType.DIMENSIONALITY_REDUCTION,
                tier=AlgorithmTier.MANIFOLD,
                description="Non-linear probability manifold technique converting Euclidean distances into student-t affinities.",
                pros=["Superb 2D/3D cluster separation and visual inspection", "Preserves local neighborhood topologies"],
                cons=["Non-parametric (cannot project new out-of-sample data points)", "Compute-heavy on N > 20,000"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N_LOG_N,
                requires_scaling=True,
                speed_tier="Moderate",
            ),
            make_tsne,
        )

        # 4. UMAP (if installed, else noted cleanly)
        if UMAP_AVAILABLE:
            def make_umap(**kwargs):
                import umap
                params = {"n_components": 2, "random_state": 42}
                return umap.UMAP(**params)

            self.register(
                AlgorithmMetadata(
                    id="umap",
                    name="Uniform Manifold Approximation and Projection (UMAP)",
                    task_type=TaskType.DIMENSIONALITY_REDUCTION,
                    tier=AlgorithmTier.MANIFOLD,
                    description="Riemannian geometry and algebraic topology manifold projection with global structure preservation.",
                    pros=["Preserves both local and global data topology", "Significantly faster than t-SNE", "Supports transform()"],
                    cons=["Requires external C++ dependency compilation"],
                    interpretability=InterpretabilityRating.MEDIUM,
                    computational_complexity=ComplexityRating.O_N_LOG_N,
                    requires_scaling=True,
                    is_available=True,
                    speed_tier="Fast",
                ),
                make_umap,
            )

        # =========================================================================
        # TIME SERIES ALGORITHMS
        # =========================================================================

        # 1. Autoregressive Lag-Embedded Ridge
        def make_ar_ridge(**kwargs):
            from sklearn.linear_model import Ridge
            return Ridge(alpha=1.0, random_state=42)

        self.register(
            AlgorithmMetadata(
                id="autoregressive_ridge",
                name="Autoregressive Lagged Ridge",
                task_type=TaskType.TIME_SERIES,
                tier=AlgorithmTier.AUTOREGRESSIVE,
                description="Time-series forecaster transforming temporal sequences into lagged feature vectors with L2 stabilization.",
                pros=["Ultra-fast temporal fitting", "Interpretable lag coefficients", "Zero divergence risk"],
                cons=["Assumes linear autoregressive dependency across historical steps"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=True,
                speed_tier="Ultra-Fast",
            ),
            make_ar_ridge,
        )

        # 2. Autoregressive HistGradientBoosting
        def make_ar_hist_gb(**kwargs):
            from sklearn.ensemble import HistGradientBoostingRegressor
            return HistGradientBoostingRegressor(max_iter=100, max_depth=6, random_state=42)

        self.register(
            AlgorithmMetadata(
                id="autoregressive_hist_gb",
                name="Autoregressive HistGradientBoosting",
                task_type=TaskType.TIME_SERIES,
                tier=AlgorithmTier.BOOSTING,
                description="Non-linear sequence forecaster combining rolling statistical aggregations with gradient boosting trees.",
                pros=["Captures non-linear seasonal regimes", "Resistant to temporal distribution shifts"],
                cons=["Multi-step forecasts require recursive or direct multi-output rollout"],
                interpretability=InterpretabilityRating.MEDIUM,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=False,
                speed_tier="Fast",
            ),
            make_ar_hist_gb,
        )

        # 3. Moving Average / Exponential Smoothing Baseline
        def make_naive_baseline(**kwargs):
            from sklearn.dummy import DummyRegressor
            return DummyRegressor(strategy="mean")

        self.register(
            AlgorithmMetadata(
                id="time_series_baseline",
                name="Historical Mean / Moving Average Baseline",
                task_type=TaskType.TIME_SERIES,
                tier=AlgorithmTier.BASELINE,
                description="Empirical benchmark forecaster predicting the rolling central tendency of historical sequence data.",
                pros=["Zero compute overhead", "Guaranteed baseline to ensure ML models add genuine predictive lift"],
                cons=["Naive extrapolation with no dynamic trend or seasonal adaptation"],
                interpretability=InterpretabilityRating.HIGH,
                computational_complexity=ComplexityRating.O_N,
                requires_scaling=False,
                speed_tier="Ultra-Fast",
            ),
            make_naive_baseline,
        )


# Global singleton instance
algorithm_registry = AlgorithmRegistry()
