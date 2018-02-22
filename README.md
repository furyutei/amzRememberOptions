amzRememberOptions
==================
Amazon.co.jp のいくつかの検索オプションを記憶するユーザースクリプト  
　License: The MIT license  
　Copyright (c) 2014 風柳(furyu)  
　対象ブラウザ： Firefox（[Greasemonkey](https://addons.mozilla.org/ja/firefox/addon/greasemonkey/)が必要）、Google Chrome（[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ja)が必要）


■ amzRememberOptionsとは？
---
[Amazon.co.jp](https://twitter.com/) での検索時、選択したカテゴリーと並べ替えのオプションを記憶してくれます。  
いつも「すべてのカテゴリー」「キーワードに関連する商品」に戻ってしまって選択しなおす面倒さから解放してくれる…かも知れません。 
  
  
あとは、私的に、著者ページの使い勝手が今一つなので、強制的に通常の検索ページへと移動します。  
これが嫌な場合には、スクリプト内の REPLACE_AUTHOR_URL を true から false に変えて下さい。  

また、「すべて表示するにはこちらをクリック」をいちいちクリックするのも煩わしいので、検索時には unfiltered=1 が強制的に付加されるようになっています。  
これも、スクリプト内の ADD_UNFILTERED_OPTION を false にすることで無効化出来ます。  


■ インストール
---
> [amzRememberOptions.user.js](https://furyu.atnifty.com/userjs/furyutei/amzRememberOptions.user.js)  

