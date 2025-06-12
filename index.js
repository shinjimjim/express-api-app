//Node.jsの`require`関数を使って、Expressモジュール（ライブラリ）を読み込む
const express = require('express'); //express: Node.jsのWebアプリケーションフレームワーク。ルーティングやミドルウェアが使える。
const fs = require('fs'); //fs: ファイルを読み書きできるNode.jsの標準モジュール（File System）。
const path = require('path'); //path: ファイルやフォルダのパスを扱うためのNode.js標準モジュール。

//express() を呼び出すことで、Expressアプリケーション（Webサーバー）インスタンスを生成します。
const app = express();
//サーバーが待ち受けるポート番号を定義。  
const PORT = 3000;

// JSONリクエストを扱うためのミドルウェア
//app.use(express.json()); //この行によって、リクエストの body に含まれる JSON データを自動で JavaScriptオブジェクトに変換してくれます。

// フォームのデータをパース（解析）（URLエンコードされたデータ）
app.use(express.urlencoded({ extended: true })); //express.urlencoded()	フォーム（URLエンコード）データをパース（解析）。extended: true は、ネストされたオブジェクトも処理可能にするオプション。

// publicフォルダ内のファイルを静的に配信
app.use(express.static('public')); //express.static('public') を使うと、public フォルダ内のファイルがそのままURLでアクセスできる。

// 保存先ファイルのパス
const FILE_PATH = path.join(__dirname, 'data', 'messages.csv'); //__dirname：このファイル（index.js）が存在するフォルダの絶対パス。path.join(...)：OSに依存しない正しいパスを作成。messages.csv：保存先のファイル名。なければ後で自動生成される。

// 1. GETルート：テキストを返す。`GET`メソッドで `/`（ルート）にアクセスがあったときの処理。
/*app.get('/', (req, res) => { //`req`：リクエストオブジェクト（誰がアクセスしたか等）。`res`：レスポンスオブジェクト（何を返すか）
  res.send('Welcome to Express API!');
});

// 2. GETルート：JSONデータを返す
app.get('/api/user', (req, res) => { // /api/user にGETアクセスがあったとき、JSONデータを返すAPIエンドポイント。
  res.json({ name: 'Alice', age: 25 }); //.json() を使うと、レスポンスが自動で Content-Type: application/json に設定されます。
}); //フロントエンドや外部アプリからデータを取得する用途に便利。

// 3. POSTルート：JSONデータを受け取って処理
app.post('/api/message', (req, res) => {
  const { name, message } = req.body; //`req.body`：POSTされたデータ（`express.json()` が必要）
  console.log(`${name} says: ${message}`); //`console.log()`：サーバー側のログに出力
  res.json({ status: 'Received', name, message }); //`res.json(...)`：受け取った内容を確認として返す（APIの応答）
});*/

// POSTルート：フォームからのデータ受信
app.post('/submit', (req, res) => {
  const { name, message } = req.body; //req.body.name など	送られたフォームのデータを取得。req.body.name と req.body.message にフォームの内容が入ります。
  //console.log(`Name: ${name}, Message: ${message}`);

  // 1行分のCSVデータを作成
  const timestamp = new Date().toISOString(); //日付付きCSV保存	new Date().toISOString()
  const csvLine = `"${timestamp}","${name}","${message.replace(/"/g, '""')}"\n`; //CSVでの安全な書式	replace(/"/g, '""')（ダブルクォートエスケープ）

  // フォルダがなければ作成
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true }); //保存先フォルダ作成	fs.mkdirSync(..., { recursive: true })。data フォルダがなければ作成（recursive: true でネスト対応）。一度作れば次回以降は何もしない。

  // 追記保存（ファイルがなければ作成）
  fs.appendFile(FILE_PATH, csvLine, (err) => { //フォームデータの保存	fs.appendFile()：CSVファイルに追記する（なければ新規作成）。
    if (err) {
      console.error('保存エラー:', err);
      return res.status(500).send('サーバーエラー'); //エラーがあれば 500 エラーを返す。
    }
  
  // 受信後、サンクスページにリダイレクト
  res.redirect('/thanks.html'); //res.redirect()	送信後にページを切り替える（リダイレクト）
  });
});

//この行によって、サーバーが動き始めます
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`); //console.log()	サーバー側でデータを確認
});

//サーバー作成	express() / app.listen()
//ルーティング	app.get(), app.post()
//JSON処理	express.json() + req.body
//レスポンス返却	res.send(), res.json()
//デバッグ出力	console.log()