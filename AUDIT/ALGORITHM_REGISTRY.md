# Agentix — Algorithm Registry Technical Specification

**Document Reference:** `AGX-SPEC-REGISTRY-001`  
**Classification:** Enterprise Machine Learning Architecture Specification  
**Product:** Agentix Enterprise SaaS Platform  
**Target Module:** `backend/core/automl/registry.py`  
**Total Algorithms Cataloged:** 32 Production-Ready Algorithms  
**Status:** Implemented, Tested & Verified  
**Date:** November 2026  

---

## 1. Registry Architecture Overview

The **Agentix Algorithm Registry** (`core.automl.registry`) is an institutional-grade algorithmic repository providing factory instantiation, mathematical metadata, computational complexity ratings, data hygiene requirements, and interpretability classifications for 32 diverse machine learning algorithms.

### 1.1 Metadata Schema Definition

Each algorithm is registered as an immutable `AlgorithmMetadata` Pydantic model:

```python
class AlgorithmMetadata(BaseModel):
    id: str                           # Unique machine identifier (e.g. 'lightgbm')
    name: str                         # Display name (e.g. 'LightGBM Classifier')
    task_type: TaskType               # CLASSIFICATION | REGRESSION | CLUSTERING | etc.
    tier: AlgorithmTier               # LINEAR | TREE | ENSEMBLE | BOOSTING | etc.
    description: str                  # Technical overview of mathematical method
    pros: List[str]                   # Algorithmic strengths
    cons: List[str]                   # Algorithmic vulnerabilities/limitations
    interpretability: InterpretabilityRating # HIGH | MEDIUM | LOW | BLACK_BOX
    computational_complexity: str     # Big-O time complexity (e.g. 'O(N log N * P)')
    supports_sparse: bool             # Native scipy.sparse CSR/CSC support
    requires_scaling: bool            # Whether feature standardization is mandatory
    handles_missing_natively: bool    # Whether algorithm bypasses imputation
    is_available: bool                # Runtime availability in current venv
    speed_tier: str                   # 'Ultra-Fast' | 'Fast' | 'Moderate' | 'Heavy'
```

---

## 2. Classification Algorithms (11)

### 2.1 Logistic Regression
- **Algorithm ID:** `logistic_regression`
- **Tier:** `AlgorithmTier.LINEAR`
- **Formulation:** Log-odds model $\ln\left(\frac{p}{1-p}\right) = \mathbf{w}^T\mathbf{x} + b$ with L2 Ridge regularization ($C=1.0$, L-BFGS solver).
- **Time Complexity:** $\mathcal{O}(N \cdot P)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High` (exact feature log-odds ratios and linear coefficients).
- **Requirements:** Requires feature scaling (`StandardScaler`); cannot handle missing values natively.
- **Strengths:** Rapid convergence, well-calibrated class probabilities, resistant to minor variance.
- **Limitations:** Cannot capture non-linear relationships without manual feature crosses.

### 2.2 Decision Tree Classifier
- **Algorithm ID:** `decision_tree`
- **Tier:** `AlgorithmTier.TREE`
- **Formulation:** Recursive binary orthogonal feature splitting minimizing Gini impurity (max depth: 10, min samples split: 5).
- **Time Complexity:** $\mathcal{O}(P \cdot N \log N)$
- **Speed Tier:** `Fast`
- **Interpretability:** `High` (visualizable decision graph and explicit if-else rules).
- **Requirements:** Invariant to feature scaling; requires imputation.
- **Strengths:** Captures non-linear thresholds and feature interactions naturally.
- **Limitations:** High variance; prone to overfitting on continuous noisy features.

### 2.3 Random Forest Classifier
- **Algorithm ID:** `random_forest`
- **Tier:** `AlgorithmTier.ENSEMBLE`
- **Formulation:** Bootstrap aggregating (bagging) of 100 decorrelated decision trees with random feature subspacing ($\sqrt{P}$).
- **Time Complexity:** $\mathcal{O}(M \cdot P \cdot N \log N)$, where $M=100$.
- **Speed Tier:** `Moderate`
- **Interpretability:** `Medium` (Gini impurity decrease feature importances).
- **Requirements:** Invariant to feature scaling; requires imputation.
- **Strengths:** Exceptional generalizer; highly resistant to overfitting and collinearity.
- **Limitations:** Slower inference latency than linear models; ensemble memory footprint grows with depth.

### 2.4 Extra Trees Classifier (Extremely Randomized Trees)
- **Algorithm ID:** `extra_trees`
- **Tier:** `AlgorithmTier.ENSEMBLE`
- **Formulation:** Ensemble of 100 decision trees with fully randomized split cutoffs and full training dataset draws.
- **Time Complexity:** $\mathcal{O}(M \cdot K \cdot N \log N)$ (faster tree construction than Random Forest).
- **Speed Tier:** `Fast`
- **Interpretability:** `Medium`.
- **Requirements:** Invariant to scaling; requires imputation.
- **Strengths:** Further reduces variance on noisy features; faster training than Random Forest.
- **Limitations:** Slightly higher bias on deterministic linear surfaces.

### 2.5 Stochastic Gradient Descent (SGD) Classifier
- **Algorithm ID:** `sgd_classifier`
- **Tier:** `AlgorithmTier.LINEAR`
- **Formulation:** Iterative subgradient descent minimizing log loss with elastic-net/L2 penalty and adaptive learning rates.
- **Time Complexity:** $\mathcal{O}(E \cdot N \cdot P)$, where $E$ is epochs (or streaming $\mathcal{O}(1)$ per batch).
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High`.
- **Requirements:** **Strictly requires feature scaling**; divergence occurs on unscaled data.
- **Strengths:** Out-of-core and streaming capability; ultra-low memory overhead on $N > 1,000,000$.
- **Limitations:** Requires careful learning-rate tuning; sensitive to scale differences.

### 2.6 Support Vector Machine (Linear SVM)
- **Algorithm ID:** `svm`
- **Tier:** `AlgorithmTier.GEOMETRIC`
- **Formulation:** Maximum-margin hyperplane separation minimizing hinge loss with L2 regularization (`LinearSVC`, dual=False).
- **Time Complexity:** $\mathcal{O}(N \cdot P)$ (linear formulation avoids kernel $\mathcal{O}(N^2)$ scaling bottleneck).
- **Speed Tier:** `Moderate`
- **Interpretability:** `Medium`.
- **Requirements:** Requires scaling; sensitive to outliers.
- **Strengths:** Excels in high-dimensional domains where feature count approaches or exceeds row count ($P \ge N$).
- **Limitations:** Does not provide native calibrated probabilities without Platt scaling.

### 2.7 K-Nearest Neighbors Classifier (KNN)
- **Algorithm ID:** `knn`
- **Tier:** `AlgorithmTier.NEIGHBORS`
- **Formulation:** Non-parametric local density assignment based on $K=5$ nearest neighbors under Euclidean distance.
- **Time Complexity:** $\mathcal{O}(N \cdot P)$ query time (or $\mathcal{O}(P \log N)$ with KD-Tree).
- **Speed Tier:** `Moderate`
- **Interpretability:** `Medium` (case-based reasoning / exemplar retrieval).
- **Requirements:** **Strictly requires feature scaling**.
- **Strengths:** Zero training phase ($\mathcal{O}(1)$ fit); captures complex irregular manifold boundaries.
- **Limitations:** Suffers severely from the curse of dimensionality when $P > 30$; high memory overhead at inference.

### 2.8 Gaussian Naive Bayes
- **Algorithm ID:** `gaussian_nb`
- **Tier:** `AlgorithmTier.NAIVE_BAYES`
- **Formulation:** Maximum a posteriori (MAP) classifier under conditional feature independence: $P(y|\mathbf{x}) \propto P(y)\prod P(x_i|y)$.
- **Time Complexity:** $\mathcal{O}(N \cdot P)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High`.
- **Requirements:** Continuous features modeled as Gaussian distributions.
- **Strengths:** Extreme training speed; effective baseline for small datasets.
- **Limitations:** Degrades when features exhibit strong mutual collinearity.

### 2.9 Gradient Boosting Classifier
- **Algorithm ID:** `gradient_boosting`
- **Tier:** `AlgorithmTier.BOOSTING`
- **Formulation:** Sequential forward stagewise additive modeling fitting shallow regression trees to pseudo-residuals of multinomial deviance.
- **Time Complexity:** $\mathcal{O}(M \cdot P \cdot N \log N)$, where $M=100$.
- **Speed Tier:** `Moderate`
- **Interpretability:** `Medium`.
- **Requirements:** Invariant to feature scaling.
- **Strengths:** High precision on complex tabular boundaries; minimizes bias aggressively.
- **Limitations:** Sequential execution cannot be fully parallelized across trees; slower than histogram-based boosters on large $N$.

### 2.10 HistGradientBoosting Classifier
- **Algorithm ID:** `hist_gradient_boosting`
- **Tier:** `AlgorithmTier.BOOSTING`
- **Formulation:** Histogram-based gradient booster binning continuous features into 256 discrete integer bins (inspired by LightGBM).
- **Time Complexity:** $\mathcal{O}(M \cdot B \cdot P)$, where $B=256 \ll N$.
- **Speed Tier:** `Fast`
- **Interpretability:** `Medium`.
- **Requirements:** Natively handles missing values; no scaling required.
- **Strengths:** Orders of magnitude faster than standard Gradient Boosting on $N > 10,000$; native missing-value routing.
- **Limitations:** Integer binning slightly quantizes continuous boundaries on micro-datasets ($N < 50$).

### 2.11 LightGBM Classifier
- **Algorithm ID:** `lightgbm`
- **Tier:** `AlgorithmTier.BOOSTING`
- **Formulation:** Fast, distributed leaf-wise (best-first) gradient tree boosting with exclusive feature bundling (EFB) and gradient-based one-side sampling (GOSS).
- **Time Complexity:** $\mathcal{O}(M \cdot B \cdot P)$ with multi-threaded CPU parallelization.
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `Medium`.
- **Requirements:** Native categorical and missing value support.
- **Strengths:** Industry gold standard for competitive tabular modeling; maximum accuracy-to-latency ratio.
- **Limitations:** Prone to overfitting on very small samples ($N < 100$) without depth constraints.

---

## 3. Regression Algorithms (10)

### 3.1 Linear Regression (Ordinary Least Squares)
- **Algorithm ID:** `linear_regression`
- **Tier:** `AlgorithmTier.LINEAR`
- **Formulation:** Closed-form normal equations $\hat{\mathbf{w}} = (\mathbf{X}^T\mathbf{X})^{-1}\mathbf{X}^T\mathbf{y}$.
- **Time Complexity:** $\mathcal{O}(N \cdot P^2 + P^3)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High` (unit change interpretations).
- **Requirements:** Requires non-singular $\mathbf{X}^T\mathbf{X}$; sensitive to multicollinearity.
- **Strengths:** Zero hyperparameters; optimal minimum variance unbiased estimator (BLUE) when Gauss-Markov assumptions hold.
- **Limitations:** Explosive variance under severe multicollinearity.

### 3.2 Ridge Regression (Tikhonov Regularization)
- **Algorithm ID:** `ridge`
- **Tier:** `AlgorithmTier.LINEAR`
- **Formulation:** $\min_{\mathbf{w}} \|\mathbf{y} - \mathbf{X}\mathbf{w}\|_2^2 + \alpha \|\mathbf{w}\|_2^2$ with $\alpha=1.0$.
- **Time Complexity:** $\mathcal{O}(N \cdot P^2 + P^3)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High`.
- **Requirements:** Requires feature scaling.
- **Strengths:** Guarantees invertible matrix $(\mathbf{X}^T\mathbf{X} + \alpha \mathbf{I})^{-1}$; highly stable baseline against collinear features.
- **Limitations:** Does not perform feature selection (coefficients shrink toward zero but remain non-zero).

### 3.3 Lasso Regression (Least Absolute Shrinkage and Selection Operator)
- **Algorithm ID:** `lasso`
- **Tier:** `AlgorithmTier.LINEAR`
- **Formulation:** $\min_{\mathbf{w}} \frac{1}{2N}\|\mathbf{y} - \mathbf{X}\mathbf{w}\|_2^2 + \alpha \|\mathbf{w}\|_1$ with coordinate descent solver ($\alpha=0.1$).
- **Time Complexity:** $\mathcal{O}(E \cdot N \cdot P)$
- **Speed Tier:** `Fast`
- **Interpretability:** `High`.
- **Requirements:** Requires feature scaling.
- **Strengths:** Sparse automatic feature selection; drives uninformative feature coefficients strictly to zero.
- **Limitations:** When $P > N$, selects at most $N$ features; arbitrarily selects one feature from a group of highly correlated predictors.

### 3.4 ElasticNet Regression
- **Algorithm ID:** `elastic_net`
- **Tier:** `AlgorithmTier.LINEAR`
- **Formulation:** Convex combination of L1 and L2 penalties: $\alpha \rho \|\mathbf{w}\|_1 + \frac{\alpha(1-\rho)}{2}\|\mathbf{w}\|_2^2$ ($l1\_ratio=0.5$).
- **Time Complexity:** $\mathcal{O}(E \cdot N \cdot P)$
- **Speed Tier:** `Fast`
- **Interpretability:** `High`.
- **Requirements:** Requires feature scaling.
- **Strengths:** Combines Lasso's feature selection with Ridge's group-selection stability under multicollinearity.
- **Limitations:** Requires tuning both $\alpha$ and $l1\_ratio$.

### 3.5 Decision Tree Regressor
- **Algorithm ID:** `decision_tree_regressor`
- **Tier:** `AlgorithmTier.TREE`
- **Formulation:** Recursive binary partitioning minimizing mean squared error (MSE) variance.
- **Time Complexity:** $\mathcal{O}(P \cdot N \log N)$
- **Speed Tier:** `Fast`
- **Interpretability:** `High`.
- **Requirements:** Invariant to feature scaling.
- **Strengths:** Captures sharp non-linear discontinuities and piecewise constants.
- **Limitations:** Step-function predictions cannot extrapolate trends beyond the minimum and maximum target bounds of the training set.

### 3.6 Random Forest Regressor
- **Algorithm ID:** `random_forest_regressor`
- **Tier:** `AlgorithmTier.ENSEMBLE`
- **Formulation:** Bagging ensemble of 100 regression trees with variance reduction via averaging.
- **Time Complexity:** $\mathcal{O}(M \cdot P \cdot N \log N)$
- **Speed Tier:** `Moderate`
- **Interpretability:** `Medium`.
- **Requirements:** Invariant to scaling.
- **Strengths:** High predictive accuracy on noisy continuous data; smooth non-linear response surfaces.
- **Limitations:** Cannot extrapolate beyond historical training target boundaries.

### 3.7 Extra Trees Regressor
- **Algorithm ID:** `extra_trees_regressor`
- **Tier:** `AlgorithmTier.ENSEMBLE`
- **Formulation:** 100 extremely randomized regression trees with random threshold cutoffs.
- **Time Complexity:** $\mathcal{O}(M \cdot K \cdot N \log N)$
- **Speed Tier:** `Fast`
- **Interpretability:** `Medium`.
- **Requirements:** Invariant to scaling.
- **Strengths:** Smoother continuous predictions and lower variance than Random Forest.
- **Limitations:** Slightly higher bias on simple smooth surfaces.

### 3.8 Gradient Boosting Regressor
- **Algorithm ID:** `gradient_boosting_regressor`
- **Tier:** `AlgorithmTier.BOOSTING`
- **Formulation:** Forward stagewise additive regression minimizing squared error or Huber loss.
- **Time Complexity:** $\mathcal{O}(M \cdot P \cdot N \log N)$
- **Speed Tier:** `Moderate`
- **Interpretability:** `Medium`.
- **Requirements:** Invariant to scaling.
- **Strengths:** Superior accuracy on structured tabular numerical response variables.
- **Limitations:** Sensitive to noisy outlier labels when using default squared loss.

### 3.9 HistGradientBoosting Regressor
- **Algorithm ID:** `hist_gradient_boosting_regressor`
- **Tier:** `AlgorithmTier.BOOSTING`
- **Formulation:** Histogram-binned gradient boosted regression trees with native missing-value routing.
- **Time Complexity:** $\mathcal{O}(M \cdot B \cdot P)$
- **Speed Tier:** `Fast`
- **Interpretability:** `Medium`.
- **Requirements:** No scaling required; handles missing values natively.
- **Strengths:** Rapid optimization across large sample sizes ($N > 20,000$); best-in-class tabular benchmark.
- **Limitations:** Discrete quantization on micro-datasets.

### 3.10 Stochastic Gradient Descent (SGD) Regressor
- **Algorithm ID:** `sgd_regressor`
- **Tier:** `AlgorithmTier.LINEAR`
- **Formulation:** Iterative subgradient descent minimizing squared loss with L2 penalty and adaptive learning rate.
- **Time Complexity:** $\mathcal{O}(E \cdot N \cdot P)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High`.
- **Requirements:** **Strictly requires target and feature scaling**.
- **Strengths:** Streaming and out-of-core scalability for massive regression sets.
- **Limitations:** Unstable gradients on unscaled continuous response variables.

---

## 4. Clustering Algorithms (5)

### 4.1 K-Means Clustering
- **Algorithm ID:** `kmeans`
- **Tier:** `AlgorithmTier.CLUSTERING`
- **Formulation:** Lloyd's algorithm minimizing within-cluster sum-of-squares (WCSS) with $K$-Means++ initialization ($K=3$, n_init=5).
- **Time Complexity:** $\mathcal{O}(I \cdot K \cdot N \cdot P)$
- **Speed Tier:** `Fast`
- **Interpretability:** `High` (cluster centroids directly represent feature prototypes).
- **Requirements:** Requires feature scaling; assumes spherical clusters with equal variance.
- **Strengths:** Fast convergence, intuitive geometric interpretation.
- **Limitations:** Requires pre-specifying $K$; sensitive to non-spherical shapes and outliers.

### 4.2 MiniBatch K-Means
- **Algorithm ID:** `minibatch_kmeans`
- **Tier:** `AlgorithmTier.CLUSTERING`
- **Formulation:** Stochastic approximation of Lloyd's algorithm using random subsamples (batch size: 256).
- **Time Complexity:** $\mathcal{O}(I \cdot K \cdot b \cdot P)$, where $b \ll N$.
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High`.
- **Requirements:** Requires feature scaling.
- **Strengths:** Near-identical cluster centroids to standard K-Means with $\ge 5\times$ latency reduction on large $N$.
- **Limitations:** Slightly higher centroid variance due to stochastic mini-batch noise.

### 4.3 DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
- **Algorithm ID:** `dbscan`
- **Tier:** `AlgorithmTier.CLUSTERING`
- **Formulation:** Density-reachable core point clustering under radius $\varepsilon=0.5$ and $min\_samples=5$.
- **Time Complexity:** $\mathcal{O}(N \log N)$ with spatial index (or $\mathcal{O}(N^2)$ without).
- **Speed Tier:** `Moderate`
- **Interpretability:** `Medium`.
- **Requirements:** Requires feature scaling.
- **Strengths:** Discovers arbitrarily shaped clusters; automatically identifies and isolates anomalous noise points (label -1); does not require specifying $K$.
- **Limitations:** Struggles with datasets having significantly varying cluster densities.

### 4.4 Agglomerative Hierarchical Clustering
- **Algorithm ID:** `agglomerative`
- **Tier:** `AlgorithmTier.CLUSTERING`
- **Formulation:** Bottom-up hierarchical tree merging clusters via Ward variance minimization linkage.
- **Time Complexity:** $\mathcal{O}(N^2 \log N)$, memory $\mathcal{O}(N^2)$.
- **Speed Tier:** `Moderate` (gated to $N \le 10,000$ to prevent RAM exhaustion).
- **Interpretability:** `High` (dendrogram hierarchy and nested sub-clusters).
- **Requirements:** Requires feature scaling.
- **Strengths:** Captures hierarchical taxonomy without specifying initial cluster seeds.
- **Limitations:** Prohibitive quadratic memory scaling on large datasets ($N > 25,000$).

### 4.5 Gaussian Mixture Models (GMM)
- **Algorithm ID:** `gaussian_mixture`
- **Tier:** `AlgorithmTier.CLUSTERING`
- **Formulation:** Expectation-Maximization (EM) fitting a mixture of $K=3$ Gaussian probability density components with full covariance.
- **Time Complexity:** $\mathcal{O}(I \cdot K \cdot N \cdot P^2)$
- **Speed Tier:** `Moderate`
- **Interpretability:** `Medium` (soft probabilistic cluster memberships).
- **Requirements:** Requires scaling.
- **Strengths:** Models non-spherical elliptical clusters; provides posterior probabilities $P(c|\mathbf{x})$ rather than hard assignments.
- **Limitations:** Prone to local optima; requires covariance matrix regularization against singularity.

---

## 5. Dimensionality Reduction Algorithms (4)

### 5.1 Principal Component Analysis (PCA)
- **Algorithm ID:** `pca`
- **Tier:** `AlgorithmTier.DECOMPOSITION`
- **Formulation:** Eigen-decomposition of the sample covariance matrix $\mathbf{X}^T\mathbf{X} = \mathbf{V}\mathbf{\Lambda}\mathbf{V}^T$ (n_components=2).
- **Time Complexity:** $\mathcal{O}(N \cdot P^2 + P^3)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High` (eigenvector loadings and explained variance ratios).
- **Requirements:** Centered data; requires scaling.
- **Strengths:** Maximum linear variance preservation; orthogonal uncorrelated axes.
- **Limitations:** Strictly linear transformation; fails on non-linear spiral or manifold topologies.

### 5.2 Truncated SVD (Latent Semantic Analysis)
- **Algorithm ID:** `truncated_svd`
- **Tier:** `AlgorithmTier.DECOMPOSITION`
- **Formulation:** Direct factorization $\mathbf{X} \approx \mathbf{U}\mathbf{\Sigma}\mathbf{V}^T$ without explicit mean centering.
- **Time Complexity:** $\mathcal{O}(N \cdot P \cdot K)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High`.
- **Requirements:** None.
- **Strengths:** Operates directly on massive sparse CSR matrices without densifying them.
- **Limitations:** Components slightly skewed if data has non-zero global mean.

### 5.3 t-Distributed Stochastic Neighbor Embedding (t-SNE)
- **Algorithm ID:** `tsne`
- **Tier:** `AlgorithmTier.MANIFOLD`
- **Formulation:** Minimizes Kullback-Leibler divergence between high-dimensional Gaussian affinities and low-dimensional Student-t probabilities.
- **Time Complexity:** $\mathcal{O}(N \log N)$ with Barnes-Hut quad-tree approximation.
- **Speed Tier:** `Moderate`
- **Interpretability:** `Low` (stochastic visualization projection).
- **Requirements:** Continuous scaled data.
- **Strengths:** World-class 2D/3D visualization of complex non-linear cluster separation.
- **Limitations:** Non-parametric (cannot project new out-of-sample data points via `transform()`).

### 5.4 Uniform Manifold Approximation and Projection (UMAP)
- **Algorithm ID:** `umap`
- **Tier:** `AlgorithmTier.MANIFOLD`
- **Formulation:** Riemannian manifold fuzzy simplicial set projection (conditionally instantiated when `umap-learn` is installed).
- **Time Complexity:** $\mathcal{O}(N \log N)$
- **Speed Tier:** `Fast`
- **Interpretability:** `Low`.
- **Requirements:** Continuous scaled data.
- **Strengths:** Preserves both local cluster affinity and global manifold distances; faster than t-SNE.
- **Limitations:** Requires optional C-compiler optimization libraries.

---

## 6. Time Series Forecasters (3)

### 6.1 Autoregressive Ridge Forecaster
- **Algorithm ID:** `autoregressive_ridge`
- **Tier:** `AlgorithmTier.TIME_SERIES`
- **Formulation:** Autoregressive lag windowing ($L=5$) transformed to linear design matrix with L2 Tikhonov regularization.
- **Time Complexity:** $\mathcal{O}(N \cdot L)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High` (lag weights explain temporal recency).
- **Requirements:** Time-ordered index; no temporal shuffling.
- **Strengths:** Numerically stable; zero drift on stationary sequential series.
- **Limitations:** Captures strictly linear temporal autoregression.

### 6.2 Autoregressive HistGradientBoosting Forecaster
- **Algorithm ID:** `autoregressive_hist_gb`
- **Tier:** `AlgorithmTier.TIME_SERIES`
- **Formulation:** Non-linear lag windowing ($L=5$) mapped through histogram-binned gradient boosted decision trees.
- **Time Complexity:** $\mathcal{O}(M \cdot B \cdot L)$
- **Speed Tier:** `Fast`
- **Interpretability:** `Medium`.
- **Requirements:** Time-ordered chronological splitting.
- **Strengths:** Captures non-linear seasonal cycles, threshold shifts, and structural regime changes.
- **Limitations:** Sensitive to long-term extrapolation without differencing.

### 6.3 Rolling Historical Baseline Forecaster
- **Algorithm ID:** `time_series_baseline`
- **Tier:** `AlgorithmTier.TIME_SERIES`
- **Formulation:** Moving average window $\hat{y}_{t+1} = \frac{1}{W}\sum_{i=0}^{W-1} y_{t-i}$ ($W=5$).
- **Time Complexity:** $\mathcal{O}(N)$
- **Speed Tier:** `Ultra-Fast`
- **Interpretability:** `High`.
- **Requirements:** Sequential temporal ordering.
- **Strengths:** Zero-parameter baseline anchor to establish minimum acceptable forecasting performance.
- **Limitations:** Constant lag behind rapid directional momentum shifts.

---

## 7. Registry Architecture Matrix

| Task Type | Algorithm Count | Baseline Algorithm | Top Performer Algorithm | Supported Scalers |
| :--- | :--- | :--- | :--- | :--- |
| **Classification** | 11 | `logistic_regression` | `lightgbm` / `hist_gradient_boosting` | Standard, Robust |
| **Regression** | 10 | `ridge` | `hist_gradient_boosting_regressor` | Standard, Robust |
| **Clustering** | 5 | `kmeans` | `minibatch_kmeans` / `dbscan` | Standard |
| **Dimensionality Reduction** | 4 | `pca` | `umap` / `tsne` | Standard, MaxAbs |
| **Time Series** | 3 | `autoregressive_ridge` | `autoregressive_hist_gb` | Standard |

---

*Authored by the Principal Software Architect & AutoML Systems Specialist.*  
*Agentix Core Architecture Group — 2026.*
