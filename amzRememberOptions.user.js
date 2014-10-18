// ==UserScript==
// @name           amzRememberOptions
// @namespace      http://d.hatena.ne.jp/furyu-tei
// @include        http://www.amazon.co.jp/*
// @include        https://www.amazon.co.jp/*
// @description    remember search options for Amazon.co.jp (ver.0.1.2.0)
// ==/UserScript==
/*
The MIT License (MIT)

Copyright (c) 2014 furyu <furyutei@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function(w, d){

//{ user parameters
var REPLACE_AUTHOR_URL = true;

var DEFAULT_SEARCH_ALIAS = 'search-alias=stripbooks';   //  select#searchDropdownBox
var DEFAULT_SORT = 'date-desc-rank';    //  select#sort
//}


w.init_amz_options = function(){
    //localStorage.clear();
    localStorage.setItem('search_alias', '');
    localStorage.setItem('sort', '');
}   // end of init_amz_options()


var main = function(){
    // === クエリ文字列分解
    var split_query_string = function(query_string) {
        var query_list = query_string.split('&');
        var param_dict = {};
        for (var ci=0,len=query_list.length; ci<len; ci++) {
            var param_parts = query_list[ci].split('=');
            param_dict[param_parts[0]] = (2 <= param_parts.length) ? decodeURIComponent(param_parts[1]) : '';
            // TODO: 同一キーが複数ある場合を考慮していない
        }
        return param_dict;
    };  // end of split_query_string()
    
    // === クエリ文字列作成
    var join_query_params = function(param_dict) {
        var query_list = [];
        for (var name in param_dict) {
            if (!param_dict.hasOwnProperty(name)) continue;
            query_list.push(name + '=' + encodeURIComponent(param_dict[name]));
        }
        return query_list.join('&');
    };  //  end of join_query_params()
    
    
    // === 正規化URL(link[name="canonical"]のhref属性)より情報取得
    var analyze_canonical_url = function(canonical_url) {
        var result = {};
        if (!canonical_url) {
            var link_canonical = d.querySelector('link[rel="canonical"]');
            if (link_canonical) canonical_url = d.querySelector('link[rel="canonical"]').href;
        }
        result['canonical_url'] = canonical_url;
        while (canonical_url) {
            if (!canonical_url.match(/^(https?:\/\/[^\/]+)\/([^\/]+)\/([^\/]+)([\/\?])(.+)$/)) break;
            result['domain_url'] = RegExp.$1;
            result['keywords'] = decodeURIComponent(RegExp.$2);
            result['kind'] = RegExp.$3;
            var method = result['method'] = (RegExp.$4 == '?') ? 'query' : 'path';
            var parameters = RegExp.$5;
            var param_dict = {};
            switch (method) {
                case    'query':
                    param_dict = split_query_string(parameters);
                    break;
                case    'path':
                    param_dict = {asin: parameters};
                    break;
            }
            result['param_dict'] = param_dict;
            break;
        }
        return result;
    };  // end of analyze_canonical_url()
    
    var ready = false;
    for (;;) {
        // === 検索フォームの各要素取得
        var elm_searchbar = d.querySelector('form#nav-searchbar');
        if (!elm_searchbar) break;
        
        var elm_textbox = elm_searchbar.querySelector('input#twotabsearchtextbox') || elm_searchbar.querySelector('*[name="field-keywords"]');
        if (!elm_textbox) break;
        
        var elm_search_dropdown_box = d.querySelector('select#searchDropdownBox') || elm_searchbar.querySelector('*[name="url"]');
        if (!elm_search_dropdown_box) break;
        
        ready = true;
        
        
        // === 保存済みオプションパラメータ取得
        var option_search_alias = localStorage.getItem('search_alias');
        var option_sort = localStorage.getItem('sort');
        if (!option_search_alias) option_search_alias = DEFAULT_SEARCH_ALIAS;
        if (!option_sort) option_sort = DEFAULT_SORT;
        
        
        // === 現ページの正規化URL情報取得
        canonical_url_info = analyze_canonical_url();
        //console.log(canonical_url_info);
        
        
        // === 著者ページURL → 著者検索ページ URL 変換
        var change_author_url = (function(){
            var action = elm_searchbar.action;
            var elm_inputs = elm_searchbar.querySelectorAll('*[name]');
            var source_form_param_dict = {};
            for (var ci=0, len=elm_inputs.length; ci < len; ci++) {
                var elm_input = elm_inputs[ci], input_name = elm_input.name, input_value = elm_input.value;
                switch (input_name) {
                    case    'field-keywords':
                        continue;
                    default:
                        break;
                }
                source_form_param_dict[input_name] = input_value;
            }
            if (!source_form_param_dict['url']) source_form_param_dict['url'] = option_search_alias;
            if (!source_form_param_dict['sort']) source_form_param_dict['sort'] = option_sort;
            
            var links = d.querySelectorAll('a.a-link-normal, div.buying a'), source_link_param_dict = null, field_name = null;
            for (var ci=0,len=links.length; ci<len; ci++) {
                if (!links[ci].href.match(/[?&]search-alias=/)) continue;
                var url_parts = links[ci].href.split('?');
                if (url_parts.length < 2) continue;
                source_link_param_dict = split_query_string(url_parts[1]);
                for (var name in source_link_param_dict) {
                    if (!source_link_param_dict.hasOwnProperty(name)) continue;
                    if (name.match(/^field-/)) {
                        field_name = name;
                        continue;
                    }
                }
                source_link_param_dict['sort'] = option_sort;
                break;
            }
            if (!field_name) field_name = 'field-author';
            
            //var is_valid = !!(elm_search_dropdown_box.value.match(/(?:books|digital-text)$/)) && REPLACE_AUTHOR_URL;
            var is_valid = REPLACE_AUTHOR_URL;
            
            return function(author_url){
                var result_url = null;
                for (;;) {
                    if (!is_valid) break;
                    
                    var source_param_dict = (author_url) ? source_link_param_dict : source_form_param_dict;
                    if (!source_param_dict) break;
                    
                    var param_dict = {};
                    for (var name in source_param_dict) {
                        if (!source_param_dict.hasOwnProperty(name)) continue;
                        param_dict[name] = source_param_dict[name];
                    }
                    if (author_url) {
                        if (!author_url.match(/\/([^\/]+)\/e\/[^\/]+\/ref=/)) break;
                        var author = RegExp.$1;
                        if (author == '-') break;
                        //param_dict['field-author'] = decodeURIComponent(author);
                        param_dict[field_name] = param_dict['text'] = decodeURIComponent(author);
                    }
                    else {
                        if (canonical_url_info.kind != 'e') break;
                        param_dict['field-author'] = canonical_url_info.keywords;
                        // TODO: 'field-author' 以外を考慮する必要はないか？
                    }
                    result_url = action + '?' + join_query_params(param_dict);
                    break;
                }
                return result_url;
            };
        })();   // end of change_author_url()
        
        
        // === 著者ページのチェック
        var new_url = change_author_url();
        if (new_url && (new_url != w.location.href)) {
            w.location.replace(new_url);    // 著者ページ→著者検索ページへリダイレクト
            break;
        }
        
        // === 著者ページへのリンク→著者検索ページへのリンクに変換
        //var links = d.querySelectorAll('div#byline span.author a.a-link-normal, div.buying a');
        var links = d.querySelectorAll('a.a-link-normal, div.buying a');
        for (var ci=0, len=links.length; ci<len; ci++) {
            var link = links[ci];
            var new_url = change_author_url(link.href);
            if (new_url && (new_url != link.href)) {
                link.href = new_url;
            }
            else {
                // 'sort' オプションの付加
                //link.href = link.href.replace(/([\?&]sort=)[^\?&]+/g, '$1'+encodeURIComponent(option_sort))
                var url_parts = link.href.split('?');
                if (2 <= url_parts.length) {
                    var url_base = url_parts[0], param_dict = split_query_string(url_parts[1]);
                    param_dict['sort'] = option_sort;
                    link.href = url_base + '?' + join_query_params(param_dict);
                }
            }
        }
        
        // === 検索フォーム内に 'sort' オプション埋め込み
        var elm_sort = elm_searchbar.querySelector('*[name="sort"]');
        if (!elm_sort) {
            var elm_sort = d.createElement('input');
            elm_sort.type = 'hidden';
            elm_sort.name = 'sort';
            elm_searchbar.appendChild(elm_sort);
        }
        elm_sort.value = option_sort;
        
        
        // === 並べ替えフォームの各要素取得
        var elm_search_sort_form = d.querySelector('form#searchSortForm');
        var elm_search_sort = (elm_search_sort_form) ? elm_search_sort_form.querySelector('select#sort') || elm_search_sort_form.querySelector('*[name="sort"]') : null;
        
        if (canonical_url_info.kind) {
            // === 検索結果画面・個別ページ等→パラメータを保存
            localStorage.setItem('search_alias', elm_search_dropdown_box.value);
            if (elm_search_sort) {
                localStorage.setItem('sort', elm_search_sort.value);
                elm_sort.value = elm_search_sort.value;
            }
        }
        else {
            // === 検索結果画面・個別ページ等以外→保存パラメータを設定
            elm_search_dropdown_box.value = option_search_alias;
            d.querySelector('span#nav-search-in-content').textContent = elm_search_dropdown_box.querySelector('option[value="'+option_search_alias+'"]').textContent;
            if (elm_search_sort) {
                elm_search_sort.value = option_sort;
            }
        }
        break;
    }
    return ready;
};  //  end of main()

var ready = main();
if (!ready) return;


// === ページ遷移を検知→メイン処理コール
var pushState = w.history.pushState;
if (pushState && w.addEventListener) {
    w.history.pushState = function(){
        pushState.apply(this, arguments);
        setTimeout(function(){main();}, 1);
    };
    w.addEventListener('popstate', function(evt){
        setTimeout(function(){main();}, 1);
    }, false);
}
else {
    var check = function(url){
        setTimeout(function(){
            var current_url = w.location.href;
            if (current_url == url) {
                check(url);
                return;
            }
            setTimeout(function(){main();}, 1);
            check(current_url);
        }, 300);
    };
    check(w.location.href);
}

})(window, document);

// ■ end of file
