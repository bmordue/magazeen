# SonarCloud Setup Guide

This document provides instructions for completing the SonarCloud integration for the Magazeen project.

## Overview

SonarCloud has been configured in this repository to provide automated static code analysis, code quality metrics, and security vulnerability detection. The configuration files have been added, but you'll need to complete a few manual steps to activate the integration.

## Configuration Files

The following files have been added to support SonarCloud:

- **`sonar-project.properties`**: Main SonarCloud configuration file
- **`.github/workflows/ci.yml`**: Updated to include SonarCloud scanning step
- **`.gitignore`**: Updated to exclude SonarCloud cache directories

## Setup Steps

### 1. Create SonarCloud Account and Project

1. Go to [SonarCloud](https://sonarcloud.io) and sign in using your GitHub account
2. Grant SonarCloud access to your GitHub repositories when prompted
3. Click "+" → "Analyze new project"
4. Select the `bmordue/magazeen` repository from the list
5. Click "Set Up" to create the project

### 2. Generate SonarCloud Token

1. In SonarCloud, click on your profile (top right) → "My Account"
2. Go to the "Security" tab
3. Under "Generate Tokens", enter a name (e.g., "GitHub Actions CI")
4. Click "Generate"
5. **Copy the token** (you won't be able to see it again)

### 3. Add Token to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/bmordue/magazeen`
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SONAR_TOKEN`
5. Value: Paste the token from step 2
6. Click "Add secret"

### 4. Verify Organization Key (Optional)

The `sonar-project.properties` file is configured with:
```properties
sonar.organization=bmordue
sonar.projectKey=bmordue_magazeen
```

If your SonarCloud organization has a different key:
1. Check your organization key in SonarCloud (Organization → Information)
2. Update the `sonar.organization` value in `sonar-project.properties` if needed

### 5. Test the Integration

1. Push a commit to the `main` branch or create a pull request
2. Go to the "Actions" tab in your GitHub repository
3. Wait for the CI workflow to complete
4. Check that the "SonarCloud Scan" step completes successfully
5. Visit your SonarCloud dashboard to view the analysis results

### 6. Configure Quality Gates (Optional)

1. In SonarCloud, go to your project → Administration → Quality Gates
2. Choose a quality gate or create a custom one
3. Set thresholds for:
   - Code Coverage (e.g., minimum 80%)
   - Duplicated Lines (e.g., maximum 3%)
   - Maintainability Rating (e.g., A)
   - Reliability Rating (e.g., A)
   - Security Rating (e.g., A)

### 7. Enable Pull Request Decoration (Automatic)

With the configuration in place, SonarCloud will automatically:
- Comment on pull requests with quality gate status
- Add inline annotations for issues found in changed code
- Update the PR status check with pass/fail results

## Current Coverage

The project currently has:
- **~64% Statement Coverage**
- **~61% Branch Coverage**
- **136 passing tests**

Coverage reports are automatically sent to SonarCloud via the `coverage/lcov.info` file.

## Troubleshooting

### SonarCloud Scan Fails

**Error**: "ERROR: You're not authorized to run analysis..."
- **Solution**: Ensure the `SONAR_TOKEN` secret is correctly set in GitHub

**Error**: "Project key not found"
- **Solution**: Verify the project was created in SonarCloud and the key matches `sonar-project.properties`

### No Coverage Data in SonarCloud

**Error**: Coverage shows 0% despite tests passing
- **Solution**: Ensure tests run before SonarCloud step in CI (already configured)
- **Solution**: Verify `coverage/lcov.info` exists after test run

### Quality Gate Failing

**Issue**: Quality gate fails unexpectedly
- **Solution**: Review the specific metrics failing in SonarCloud dashboard
- **Solution**: Adjust quality gate thresholds or improve code quality

## Additional Resources

- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [GitHub Actions for SonarCloud](https://docs.sonarcloud.io/advanced-setup/ci-based-analysis/github-actions-for-sonarcloud/)
- [Quality Gates Guide](https://docs.sonarcloud.io/concepts/quality-gates/)
- [SonarCloud Community Forum](https://community.sonarsource.com/c/help/sc/9)

## Maintenance

The SonarCloud integration requires minimal maintenance:
- Token rotation: Generate a new token periodically and update the GitHub secret
- Quality gate adjustments: Update thresholds as code quality improves
- Configuration updates: Modify `sonar-project.properties` as needed

---

For questions or issues with this setup, please refer to the SonarCloud documentation or create an issue in this repository.
