#!/bin/bash

# Vercel デプロイスクリプト
# 実行方法: bash DEPLOY_NOW.sh

set -e

echo "🚀 Vercelデプロイを開始します..."
echo ""

# プロジェクトディレクトリに移動
cd /home/user/webapp/order-management-system

echo "✅ プロジェクトディレクトリ: $(pwd)"
echo ""

# ビルドテスト
echo "📦 ビルドテストを実行中..."
npm run build
echo "✅ ビルド成功！"
echo ""

# GitHubリポジトリの確認
echo "📋 GitHubリポジトリの設定:"
git remote -v
echo ""

# Git状態の確認
echo "📊 Git状態:"
git status --short
echo ""

# Vercel CLIのバージョン確認
echo "🔧 Vercel CLI バージョン:"
npx vercel --version
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "次のステップ:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. GitHubリポジトリを作成:"
echo "   https://github.com/new"
echo "   Repository name: order-management-system"
echo ""
echo "2. コードをプッシュ:"
echo "   git remote add origin https://github.com/kazunarihonda83-jpg/order-management-system.git"
echo "   git push -u origin master"
echo ""
echo "3. Vercelにログイン:"
echo "   npx vercel login"
echo ""
echo "4. Vercelにデプロイ:"
echo "   npx vercel --prod"
echo ""
echo "または、Vercel Dashboardを使用:"
echo "   https://vercel.com/new"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ すべての準備が完了しました！"
echo ""
