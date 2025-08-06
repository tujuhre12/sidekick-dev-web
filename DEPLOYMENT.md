# Deployment Guide

## GitHub Pages Deployment

The frontend is configured to deploy automatically to GitHub Pages when changes are pushed to the main branch.

### Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to your repository Settings
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select "GitHub Actions"

2. **Configure the production backend URL:**
   - Edit `.github/workflows/deploy.yml`
   - Replace `https://your-backend-domain.com` with your actual production backend URL
   - The environment variable `VITE_API_URL` will be used by the frontend to connect to your backend

3. **Deploy:**
   - Push your changes to the main branch
   - GitHub Actions will automatically build and deploy your frontend
   - Your site will be available at: `https://your-username.github.io/sidekick-dev-web/`

### Local Testing

To test the production build locally:

```bash
cd frontend
npm run build:prod
npm run preview
```

### Environment Variables

The frontend uses the following environment variables:

- `VITE_API_URL`: The base URL for your backend API
  - **Development**: Defaults to `http://localhost:8000`
  - **Production**: Set in the GitHub Actions workflow (currently set to `https://your-backend-domain.com`)

### Updating Backend URL

When you're ready to connect to your production backend:

1. Edit `.github/workflows/deploy.yml`
2. Update the `VITE_API_URL` environment variable under the "Build" step
3. Push your changes to trigger a new deployment

### Manual Deployment

If you need to deploy manually:

```bash
cd frontend
npm run build:prod
# Upload the contents of the dist/ folder to your web server
```