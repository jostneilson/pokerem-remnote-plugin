const path=require('path');
const HtmlWebpackPlugin=require('html-webpack-plugin');
const original=require('../../webpack.config.js');
module.exports={...original,entry:{preview:path.resolve(__dirname,'index.tsx')},output:{path:path.resolve(__dirname,'../../.preview-dist'),filename:'preview.js',publicPath:'/'},plugins:original.plugins.filter(p=>!['HtmlWebpackPlugin','BannerPlugin','ReactRefreshPlugin'].includes(p.constructor.name)).concat(new HtmlWebpackPlugin({templateContent:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>PokéRem isolated QA</title></head><body><div id="app"></div></body></html>'})),devServer:{host:'127.0.0.1',port:8081,hot:false,open:false},optimization:{minimize:false}};
