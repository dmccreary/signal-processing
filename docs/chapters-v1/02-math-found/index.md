# Chapter 2: Mathematical Foundations

Covers the essential mathematical tools required for signal processing, including linear algebra, complex numbers, and probability theory.

!!! Note
    We now have a new intelligent textbook that covers many of the topics in linear algebra.  See [This GitHub Repo](https://artemispearson.github.io/learning-graphs/) for details.

### Chapter Sections

## Linear Algebra Review

-   **Vectors and Matrices**: Operations, properties, and applications.
-   **Eigenvalues and Eigenvectors**: Their role in system analysis.

## Complex Numbers and Functions

-   **Complex Arithmetic**: Addition, multiplication, and representation.
-   **Phasors and Exponentials**: Application in signal representation.

## Probability and Statistics

-   **Random Variables**: Definitions and properties.
-   **Statistical Measures**: Mean, variance, and correlations.

## Linear Algebra for Signal Processing

### 4.1 Introduction

Linear algebra is a fundamental mathematical tool that is essential for understanding and analyzing signals. It provides a powerful framework for representing and manipulating signals as vectors and matrices, and for solving systems of linear equations that arise in signal processing applications. In this chapter, we will explore the key concepts of linear algebra that are relevant to signal processing, including vectors, matrices, and their operations, and apply them to various signal processing problems.

### 4.2 Vectors and Signals

A signal can be represented as a vector, where each element of the vector corresponds to a sample of the signal. For example, a discrete-time signal can be represented as a column vector, where each element represents the value of the signal at a particular time instant.

**4.2.1 Vector Operations**

The same vector operations that we discussed in Chapter 3 can be applied to signals. For example, we can add, subtract, and multiply signals, and we can calculate the dot product of two signals.

**4.2.2 Signal Representation**

-   **Time-Domain Representation:** A signal can be represented in the time domain as a vector of samples.
-   **Frequency-Domain Representation:** A signal can also be represented in the frequency domain using the Fourier transform. The Fourier transform of a signal is a vector whose elements represent the amplitude and phase of the signal at different frequencies.

### 4.3 Matrices and Systems of Linear Equations

Matrices are used to represent systems of linear equations, which arise in many signal processing applications.

**4.3.1 Matrix Representation**

A system of linear equations can be represented in matrix form as:

$$ 
&lt;0>mathbf{A} \mathbf{x} = \mathbf{b}
$$

where A is the coefficient matrix, x is the vector of unknowns, and b is the constant vector.

**4.3.2 Applications to Signal Processing**

-   **Filtering:** Filters can be represented as linear systems, and the filter output can be calculated by multiplying the input signal by the filter's impulse response matrix.
-   **System Identification:** System identification involves determining the parameters of a system based on input and output measurements. This can be formulated as a system of linear equations.

### 4.4 Eigenvalues and Eigenvectors

Eigenvalues and eigenvectors are important concepts in linear algebra that have applications in signal processing.  

**4.4.1 Definition**

An eigenvalue of a square matrix A is a scalar λ such that there exists a nonzero vector x, called an eigenvector, satisfying the equation:

$$
\mathbf{A} \mathbf{x} = \lambda \mathbf{x}
$$

**4.4.2 Applications to Signal Processing**

-   **Principal Component Analysis (PCA):** PCA is a technique for dimensionality reduction that involves finding the eigenvectors of the covariance matrix of a set of data points.
-   **Singular Value Decomposition (SVD):** SVD is a matrix decomposition technique that can be used to analyze the structure of a signal or system.

### 4.5 Convolution

Convolution is a mathematical operation that is fundamental to signal processing. It is used to represent the output of a linear system when the input is a signal.

**4.5.1 Definition**

The convolution of two signals, x\[n\] and h\[n\], is defined as:

$$
y\[n\] = x\[n\] \* h\[n\] = \sum\_{k=-\infty}^{\infty} x\[k\] h\[n-k\] 
$$

**4.5.2 Applications to Signal Processing**

-   **Filtering:** Filters can be implemented using convolution.
-   **System Analysis:** The impulse response of a system is the output of the system when the input is an impulse. The output of a system can be calculated by convolving the input signal with the system's impulse response.

### 4.6 Conclusion

Linear algebra is a powerful tool for analyzing signals and systems. By understanding vectors, matrices, and their operations, we can effectively represent and manipulate signals, and solve systems of linear equations that arise in signal processing applications. In this chapter, we have explored the fundamental concepts of linear algebra that are relevant to signal processing, and applied them to various signal processing problems.