//Node.jsの`require`関数を使って、Expressモジュール（ライブラリ）を読み込む
const express = require('express'); //express: Node.jsのWebアプリケーションフレームワーク。ルーティングやミドルウェアが使える。
const mongoose = require('mongoose'); //MongoDBとNode.jsをつなぐODMライブラリ「Mongoose」を読み込みます。これにより、MongoDBのデータ操作をJavaScript的な書き方で扱えるようになります。
const Message = require('./models/Message'); //`models/Message.js` に定義された Mongoose モデル（スキーマ付きのデータ定義）を読み込みます。これがMongoDBの `messages` コレクションの操作に使われます。
const path = require('path'); //path：ファイルパス操作用（views/ フォルダ指定に使う）ファイルやフォルダのパスを扱うためのNode.js標準モジュール。
const fs = require('fs'); //fs: ファイルを読み書きできるNode.jsの標準モジュール（File System）。
const createCsvWriter = require('csv-writer').createObjectCsvWriter; //CSVエクスポート用ライブラリ
const PDFDocument = require('pdfkit'); //PDFエクスポート用ライブラリ

//express() を呼び出すことで、Expressアプリケーション（Webサーバー）インスタンスを生成します。
const app = express();
//サーバーが待ち受けるポート番号を定義。  
const PORT = 3000;

// MongoDB接続
mongoose.connect('mongodb://localhost:27017/contactForm', { //mongoose.connect() でMongoDBに接続。contactForm というデータベースを指定
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected')) //.then() で接続成功時のメッセージ表示
  .catch(err => console.error('MongoDB connection error:', err)); //.catch() でエラー発生時のログ出力

// JSONリクエストを扱うためのミドルウェア
//app.use(express.json()); //この行によって、リクエストの body に含まれる JSON データを自動で JavaScriptオブジェクトに変換してくれます。
// フォームのデータをパース（解析）（URLエンコードされたデータ）
app.use(express.urlencoded({ extended: true })); //express.urlencoded()	フォーム（URLエンコード）データをパース（解析）。extended: true は、ネストされたオブジェクトも処理可能にするオプション。express.urlencoded() ミドルウェアが有効になっているから req.body が使えます。
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

// GET: 編集フォーム表示
app.get('/messages/edit/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id); //`req.params.id`：URLの `:id` に該当する文字列を取得。`await`：結果が返るまで待機（非同期のPromiseを待つ）
    if (!message) {
      return res.status(404).send('メッセージが見つかりません'); //res.status(404)：HTTPステータスを「Not Found（見つからない）」に設定。res.send()：簡単なエラーメッセージを返す
    }
    res.render('edit', { message, error: null }); //`res.render()`：EJSテンプレートを表示するメソッド。`'edit'`：`views/edit.ejs` を表示。`{ message, error: null }`：EJSに渡すデータ（オブジェクト）。EJS側で `<%= message.name %>` などの形で表示できます。
  } catch (err) {
    console.error('編集フォーム表示エラー:', err); //console.error()：開発者向けに詳細ログを出力
    res.status(500).send('サーバーエラー'); //res.status(500).send()：クライアント側には「500 サーバーエラー」を返す
  }
});

// POST: 編集フォーム送信
app.post('/messages/edit/:id', async (req, res) => { //`async`：非同期処理を使えるようにしている（MongooseのDB操作は非同期）
  const { name, message } = req.body; //req.body：フォームから送信されたデータを取得（name="name", name="message"）

  if (!name || !message) { //入力が空の場合（未入力）のバリデーション
    const oldMessage = await Message.findById(req.params.id); //入力が不正でもフォームを再表示する必要があるため、元のメッセージをデータベースから再取得
    return res.render('edit', { //`edit.ejs` にエラー付きで再表示
      message: oldMessage, //`message`：再取得した元のメッセージ
      error: '名前とメッセージは必須です' //`error`：EJS側で `<%= error %>` として表示される
    }); //`return` をつけていることで、これ以降の処理を中断します。
  }

  try {
    //`Message.findByIdAndUpdate(id, updateObj)`：Mongooseの標準的な更新メソッド
    await Message.findByIdAndUpdate(req.params.id, { name, message }); //`{ name, message }`：更新する内容（フィールド）
    res.redirect('/messages');
  } catch (err) {
    console.error('編集保存エラー:', err);
    res.status(500).send('更新に失敗しました'); //`res.status(500)` でHTTPエラーとしてクライアントに通知
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
    //MongoDBの検索条件（クエリ）をクエリパラメータに基づいて動的に作成して実行する
    //クライアントがURLで指定した ?name=◯◯&after=◯◯ などのクエリパラメータを取得しています。
    const { name, after } = req.query; //req.query は、Expressが提供するクエリパラメータのオブジェクト。
    const query = {}; //MongoDBに渡すための「検索条件オブジェクト」を空で用意します。この後に query.name や query.createdAt を条件に応じて追加していきます。

    //ユーザーが ?name=山田 のように名前を指定した場合だけ処理します。
    if (name) {
      //query.name = new RegExp(name, 'i'); // 名前に部分一致（大文字小文字無視）。new RegExp(name, 'i') は正規表現（Regex）で部分一致検索を可能にします。
      query.name = name; //「完全一致検索」
    }

    //after が指定された場合（例：?after=2025-06-01）は、それを日付に変換します。
    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate)) { //afterDate が有効な日付なら（NaNでなければ）、「作成日時（createdAt）が afterDate 以降」の条件を追加。
        query.createdAt = { $gte: afterDate }; // createdAt: { $gte: 日付 } は、MongoDBで「日付以降」のデータを取得する書き方。$gte は greater than or equal to（以上）という意味。
      }
    }

    const messages = await Message.find(query).sort({ createdAt: -1 }); //MongoDBからqueryを使ってメッセージを取得します。.sort({ createdAt: -1 }) で新しい順に並べています。

    // ファイル名に現在の日付を含める（例：messages_2025-06-28.csv）
    const today = new Date(); //現在の日付を取得
    const dateStr = today.toISOString().split('T')[0]; // toISOString() → "2025-06-29T12:34:56.789Z" のような形式になるので、split('T')[0] で "2025-06-29" だけ取り出しています。
    const filename = `messages_${dateStr}.csv`;

    const csvWriter = createCsvWriter({ //csvWriter は csv-writer ライブラリを使ったCSV書き出しインスタンスです。
      path: filename, //path：保存先のCSVファイル名
      header: [ //header：CSVの1行目に表示される列名（日本語タイトルOK）
        { id: 'name', title: '名前' }, //各 id はMongoDBのフィールド名、title はCSVのカラム見出し。
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

    // UTF-8 BOMを先頭に付けて（Excel で文字化けしないようにする）ファイルを再保存
    //BOMをバッファ形式で生成する
    const bom = Buffer.from('\uFEFF', 'utf-8'); //\uFEFF は BOM（Byte Order Mark） を表す Unicode 文字。Buffer.from(..., 'utf-8') は、UTF-8エンコーディングで「バイナリデータ（バッファ）」を作成するNode.jsの関数。
    //content は「BOMなしのCSVファイルの中身」
    const content = fs.readFileSync(filename); //fs.readFileSync() は同期的にファイルをバッファ形式で読み込みます。
    //filename は「BOM付きのUTF-8 CSVファイル」に更新される。
    fs.writeFileSync(filename, Buffer.concat([bom, content])); //Buffer.concat([bom, content]) は BOM と CSVの中身を先頭から1つのバッファに結合します。[bom, content] は [BOMの3バイト, CSVの中身]その結果を writeFileSync() で元の filename に上書き保存します。

    // ファイルを送信し、その後削除
    //res.download() はクライアントにCSVファイルを送信して、ダウンロードを開始させるメソッド。（ブラウザに保存ダイアログが出る）
    //第2引数 filename でクライアント側のファイル名を指定できます。
    //第3引数のコールバック関数 err => {} は、送信完了時または失敗時に実行される関数。
    res.download(path.resolve(filename), filename, (err) => { //path.resolve() は絶対パスに変換（セキュリティ的にも推奨）
      if (err) {
        console.error('CSV送信エラー:', err);
      }

      // ダウンロード完了後に削除
      fs.unlink(filename, (unlinkErr) => { //fs.unlink(filename)	一時ファイルを削除するNode.jsの関数
        if (unlinkErr) {
          console.error('CSV削除エラー:', unlinkErr);
        } else {
          console.log(`🧹 一時CSVファイルを削除: ${filename}`);
        }
      });
    });

  } catch (err) {
    console.error('CSVエクスポートエラー:', err);
    res.status(500).send('CSVエクスポート中にエラーが発生しました');
  }
});

//MongoDBのデータをPDF形式で出力・ダウンロードできるようにするNode.js + Expressのルート処理
app.get('/export/pdf', async (req, res) => {
  try {
    //クエリパラメータ（nameやafter）でデータを絞り込む
    const { name, after } = req.query; //URLクエリ（?name=山田&after=2025-06-01）を取得
    const query = {}; //検索条件 query を空のオブジェクトで初期化。

    if (name) {
      query.name = name; //「完全一致検索」
    }

    if (after) { //after=2025-06-01 のように指定されたら、日付以降の投稿のみ取得。
      const afterDate = new Date(after);
      if (!isNaN(afterDate)) {
        query.createdAt = { $gte: afterDate }; //$gte は「greater than or equal（以上）」の意味。
      }
    }

    //MongoDBから投稿メッセージを取得
    const messages = await Message.find(query).sort({ createdAt: -1 });

    //今日の日付を取得し、ファイル名（例：messages_2025-06-29.pdf）を作成。
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `messages_${dateStr}.pdf`;

    // レスポンス設定（PDFで直接ダウンロード）
    //ブラウザに PDFファイルをダウンロードさせるためのヘッダー設定。
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); //Content-Disposition: attachment で「ダウンロード指示」。
    res.setHeader('Content-Type', 'application/pdf');

    const doc = new PDFDocument(); //PDFDocument のインスタンス（doc）を作成。
    doc.pipe(res); // pipe(res) により、PDFの出力先をレスポンス（ブラウザ）に直接設定。

    // ✅ フォントを日本語対応に変更
    const fontPath = path.join(__dirname, 'fonts', 'NotoSansJP-Regular.ttf'); //.ttf（TrueType Font）を明示的に読み込まないと日本語が文字化けします。
    doc.font(fontPath);

    doc.fontSize(18).text(`メッセージ一覧（${dateStr} 時点）`, {
      align: 'center' //タイトルを中央寄せで表示。
    });
    doc.moveDown(); //moveDown() で1行下にスペース。

    messages.forEach(msg => {
      const createdAt = msg.createdAt.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      //メッセージ1件ずつ、名前・本文・日時をPDFに出力。
      doc
        .fontSize(14)
        .text(`名前: ${msg.name}`)
        .text(`メッセージ: ${msg.message}`)
        .text(`投稿日時: ${createdAt}`)
        .moveDown(); //.moveDown() で行間にスペースを空ける。
    });

    doc.end(); // PDF終了。ファイルを書き出して完了。

  } catch (err) {
    console.error('PDF出力エラー:', err);
    res.status(500).send('PDFエクスポート中にエラーが発生しました');
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

//以下のように指定してダウンロード可能にします
// http://localhost:3000/export/csv?name=田中
// http://localhost:3000/export/csv?after=2025-06-20
// http://localhost:3000/export/csv?name=田中&after=2025-06-20