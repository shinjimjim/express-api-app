//Node.jsの`require`関数を使って、Expressモジュール（ライブラリ）を読み込む
const express = require('express'); //express: Node.jsのWebアプリケーションフレームワーク。ルーティングやミドルウェアが使える。
const mongoose = require('mongoose'); //MongoDBとNode.jsをつなぐODMライブラリ「Mongoose」を読み込みます。これにより、MongoDBのデータ操作をJavaScript的な書き方で扱えるようになります。
const Message = require('./models/Message'); //`models/Message.js` に定義された Mongoose モデル（スキーマ付きのデータ定義）を読み込みます。これがMongoDBの `messages` コレクションの操作に使われます。
const path = require('path'); //path：ファイルパス操作用（views/ フォルダ指定に使う）ファイルやフォルダのパスを扱うためのNode.js標準モジュール。
//const fs = require('fs'); //fs: ファイルを読み書きできるNode.jsの標準モジュール（File System）。

//express() を呼び出すことで、Expressアプリケーション（Webサーバー）インスタンスを生成します。
const app = express();
//サーバーが待ち受けるポート番号を定義。  
const PORT = 3000;

// CSVエクスポート用ライブラリ
const createCsvWriter = require('csv-writer').createObjectCsvWriter; //csv-writer：CSVファイルを書き出すためのライブラリ

// MongoDB接続
mongoose.connect('mongodb://localhost:27017/contactForm', { //mongoose.connect() でMongoDBに接続。contactForm というデータベースを指定
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected')) //.then() で接続成功時のメッセージ表示
  .catch(err => console.error('MongoDB connection error:', err)); //.catch() でエラー発生時のログ出力

// JSONリクエストを扱うためのミドルウェア
//app.use(express.json()); //この行によって、リクエストの body に含まれる JSON データを自動で JavaScriptオブジェクトに変換してくれます。
// フォームのデータをパース（解析）（URLエンコードされたデータ）
app.use(express.urlencoded({ extended: true })); //express.urlencoded()	フォーム（URLエンコード）データをパース（解析）。extended: true は、ネストされたオブジェクトも処理可能にするオプション。
// publicフォルダ内のファイルを静的に配信
app.use(express.static('public')); //express.static('public') を使うと、public フォルダ内のファイルがそのままURLでアクセスできる。

// EJSテンプレートエンジンの設定
app.set('view engine', 'ejs'); //view engine：HTMLを生成するテンプレートとして EJS を使う
app.set('views', path.join(__dirname, 'views')); //views：EJSファイルが入っているフォルダ（views/messages.ejs など）

// 保存先ファイルのパス
//const FILE_PATH = path.join(__dirname, 'data', 'messages.csv'); //__dirname：このファイル（index.js）が存在するフォルダの絶対パス。path.join(...)：OSに依存しない正しいパスを作成。messages.csv：保存先のファイル名。なければ後で自動生成される。

// GET: フォーム表示（初期表示用）
app.get('/form', (req, res) => {
  res.render('form', { error: null, name: '', message: '' }); //初期表示時は error, name, message を空で渡す。
});

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
//app.post('/submit', (req, res) => {
app.post('/submit', async (req, res) => { //async キーワードは、この関数が非同期処理（データベース操作など）を含むことを示しており、await を使用できます。
  const { name, message } = req.body; //req.body.name など	送られたフォームのデータを取得。req.body.name と req.body.message にフォームの内容が入ります。
  //console.log(`Name: ${name}, Message: ${message}`);

  /*// 1行分のCSVデータを作成
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
  });*/

  if (!name || !message) { //空チェック（バリデーション）で未入力ならエラーメッセージ付きで再表示。
    return res.status(400).render('form', { //再び form.ejs テンプレートをレンダリングして、エラーメッセージと一緒にユーザーに表示します。
      error: '名前とメッセージは必須です。',
      name,
      message //ユーザーが入力した内容を再度フォームに表示するために、name と message の値をそのまま渡します。
    });
  }

  try { //try ブロック内でエラーが発生した場合、この catch ブロックが実行されます。
    const newMessage = new Message({ name, message }); //new Message(...) で新しいメッセージドキュメントを作成
    await newMessage.save(); //save() でMongoDBに保存（非同期処理なので await）
    res.redirect('/thanks.html'); //保存に成功したら /thanks.html にリダイレクト
  } catch (error) {
    console.error('DB保存エラー:', error);
    res.status(500).send('サーバーエラー'); //エラー時は 500 エラーを返す
  }
});

// メッセージ一覧表示
app.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }); //MongoDBからすべてのメッセージを新しい順で取得
    res.render('messages', { messages }); //messages.ejs に渡してHTML生成して返す
  } catch (error) {
    console.error('取得エラー:', error);
    res.status(500).send('エラーが発生しました');
  }
});

// 削除処理ルート
app.post('/messages/delete/:id', async (req, res) => { //URLに含まれるID（例: /messages/delete/123）を使って、該当メッセージを削除。
  try {
    await Message.findByIdAndDelete(req.params.id); //req.params.id: URL から取得したメッセージの ID を表します。await: 削除処理が完了するまで待ちます。
    res.redirect('/messages'); //成功したらメッセージ一覧に戻る。
  } catch (error) {
    console.error('削除エラー:', error);
    res.status(500).send('削除に失敗しました');
  }
});

// GET: CSVエクスポート
app.get('/export/csv', async (req, res) => { //ユーザーが /export/csv にアクセスするとこの関数が実行されます。
  try {
    const messages = await Message.find().sort({ createdAt: -1 }); //MongoDBから全てのメッセージを取得します。.sort({ createdAt: -1 }) で新しい順に並べています。

    const csvWriter = createCsvWriter({ //csvWriter は csv-writer ライブラリを使ったCSV書き出しインスタンスです。
      path: 'messages.csv', //path：保存先のCSVファイル名（この場合は messages.csv）
      header: [ //header：CSVの1行目に表示される列名（日本語タイトルOK）
        { id: 'name', title: '名前' },
        { id: 'message', title: 'メッセージ' },
        { id: 'createdAt', title: '作成日時' }
      ]
    });

    const data = messages.map(msg => ({ //messages を MongoDB から取得。messages を .map() で1つ1つ { name, message, createdAt } の形に変換
      name: msg.name,
      message: msg.message,
      createdAt: msg.createdAt.toLocaleString('ja-JP', { //createdAt.toLocaleString() は日付を「YYYY/MM/DD HH:mm:ss」形式に整形しています
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) //ja-JP, Asia/Tokyo で 日本語＆日本時間 に揃えています（重要）
    }));

    await csvWriter.writeRecords(data); //csvWriter.writeRecords(...) でCSVファイルを作成
    res.download(path.resolve('messages.csv')); //res.download(...) でダウンロード開始（ブラウザに保存ダイアログが出る）path.resolve() は絶対パスに変換（セキュリティ的にも推奨）
  } catch (err) {
    console.error('CSVエクスポートエラー:', err);
    res.status(500).send('CSVエクスポート中にエラーが発生しました');
  }
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