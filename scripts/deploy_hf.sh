#!/usr/bin/env bash
# Deploy updates to Hugging Face Spaces without binary file conflicts
set -e

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀 Preparing deployment to Hugging Face Spaces (https://huggingface.co/spaces/amer003100/Mnemos)..."

git checkout hf-deploy
git checkout "$CURRENT_BRANCH" -- app.py requirements.txt backend langgraph docs
git add -A
if ! git diff-index --quiet HEAD --; then
    git commit -m "feat(deploy): sync changes from $CURRENT_BRANCH for Hugging Face Spaces"
fi

git push -f hf hf-deploy:main
git checkout "$CURRENT_BRANCH"

echo "✅ Successfully deployed to Hugging Face Spaces!"
echo "🌐 Live Backend URL: https://amer003100-mnemos.hf.space"
echo "📖 Swagger Docs:     https://amer003100-mnemos.hf.space/docs"
echo "🩺 Health Check:     https://amer003100-mnemos.hf.space/health"
