//Mongoose（MongoDBのためのODM） を使って、データベースとやり取りするための「モデル定義ファイル」
//Node.js で Mongooseライブラリを読み込みます。
const mongoose = require('mongoose'); //Mongooseは、MongoDBのデータ構造（スキーマ）を扱いやすくするためのツールです。Mongooseを使うと、「データの型」「初期値」「制約」などをモデルで定義できます。

//MongoDBの「ドキュメント構造の設計図（Schema）」を定義します。
const messageSchema = new mongoose.Schema({ //new mongoose.Schema() に渡すオブジェクトは、各フィールドの型やオプションです。
  name: String,
  message: String,
  createdAt: { //createdAt	Date	作成日時。初期値を Date.now にして、保存時に自動で現在日時をセット
    type: Date,
    default: Date.now
  }
});

//この行で「モデル（データ操作クラス）」を作って、外部に公開しています。
module.exports = mongoose.model('Message', messageSchema);  //第1引数 'Message' がモデル名です。MongoDB内部では自動で小文字＋複数形の「messages」というコレクションになります。
//messageSchema はこのモデルの構造（スキーマ）です
