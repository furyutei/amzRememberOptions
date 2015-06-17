// ==UserScript==
// @name            amzRememberOptions
// @namespace       http://d.hatena.ne.jp/furyu-tei
// @author          furyu
// @version         0.1.5.1
// @include         http://www.amazon.co.jp/*
// @include         https://www.amazon.co.jp/*
// @description     remember search options for Amazon.co.jp
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
var ADD_UNFILTERED_OPTION = true;

var DEFAULT_SEARCH_ALIAS = 'search-alias=stripbooks';   //  select#searchDropdownBox
var DEFAULT_SORT = 'date-desc-rank';    //  select#sort
//}


//{ global parameters
var SCRIPT_NAME = 'amzRememberOptions';
//}


//{ functions
w.init_amz_options = function(){
    //localStorage.clear();
    localStorage.setItem('search_alias', '');
    localStorage.setItem('sort', '');
}   // end of init_amz_options()


var check_dom_node_inserted = null;

var main = function(){
    // === クエリ文字列分解
    var split_query_string = function(query_string) {
        var query_list = query_string.split('&');
        var param_dict = {};
        for (var ci=0,len=query_list.length; ci<len; ci++) {
            var param_parts = query_list[ci].split('=');
            if (!param_parts[0]) continue;
            param_dict[param_parts[0]] = (2 <= param_parts.length) ? decodeURIComponent(param_parts[1]) : '';
            // TODO: 同一キーが複数ある場合を考慮していない
        }
        return param_dict;
    };  // end of split_query_string()
    
    // === クエリ文字列作成
    var join_query_params = function(param_dict) {
        var query_list = [];
        if (!param_dict || typeof param_dict != 'object') return '';
        for (var name in param_dict) {
            if (!param_dict.hasOwnProperty(name)) continue;
            query_list.push(name + '=' + encodeURIComponent(param_dict[name]));
        }
        return query_list.join('&');
    };  //  end of join_query_params()
    
    // === URL 分析
    var analyze_url = function(url) {
        var result = {base_url:'', param_dict:{}, fragment:''};
        while (typeof url == 'string') {
            var url_parts = url.split('#');
            var fragment = (2 <= url_parts.length) ? url_parts[1] : '';
            url = url_parts[0];
            url_parts = url.split('?');
            var base_url = url_parts[0];
            var query_string = (2 <= url_parts.length) ? url_parts[1] : '';
            result = {
                base_url: base_url
            ,   param_dict: split_query_string(query_string)
            ,   fragment: fragment
            };
            break;
        }
        return result;
    };  //  end of analyze_url()
    
    // === URL 結合
    var join_url = function(url_part_dict) {
        var url = (url_part_dict['base_url']) ? url_part_dict['base_url'] : '';
        var query_string = join_query_params(url_part_dict.param_dict);
        if (query_string) url += '?' + query_string;
        if (url_part_dict['fragment']) url += '#' + url_part_dict['fragment'];
        return url;
    };  //  end of join_url()
    
    // === DOM要素のURL分析
    var analyze_url_elm = function(elm) {
        var result = {base_url:'', param_dict:{}, fragment:''};
        for (;;) {
            if (typeof elm == 'string') {
                var url = elm;
                result = analyze_url(url);
                break;
            }
            if (!elm || typeof elm != 'object') break;
            var nodename = elm.nodeName.toLowerCase();
            switch (nodename) {
                case    'form':
                    var base_url = elm.action, param_dict = {}, fragment = '';
                    var elm_params = elm.querySelectorAll('*[name]');
                    for (var ci=0,len=elm_params.length; ci<len; ci++) {
                        param_dict[elm_params[ci].name] = elm_params[ci].value;
                        // TODO: 同一キーが複数ある場合を考慮していない
                    }
                    result = {
                        base_url: base_url
                    ,   param_dict: param_dict
                    ,   fragment: fragment
                    };
                    break;
                default:
                    var url = (elm.href) ? elm.href : elm.src;
                    if (!url) break;
                    result = analyze_url(url);
                    break;
            }
            break;
        }
        return result;
    };  //  end of analyze_url_elm()
    
    // === 正規化URL(link[name="canonical"]のhref属性)より情報取得
    var analyze_canonical_url = function(canonical_url) {
        if (!canonical_url) {
            var link_canonical = d.querySelector('link[rel="canonical"]');
            if (link_canonical) canonical_url = d.querySelector('link[rel="canonical"]').href;
        }
        var result = analyze_url(canonical_url);
        result['canonical_url'] = canonical_url;
        result['domain_url'] = result['keywords'] = result['kind'] = result['asin'] = '';
        
        while (result.base_url) {
            var base_url = result.base_url;
            if (!base_url.match(/^(https?:\/\/[^\/]+)\/([^\/]+)\/([^\/]+)(?:\/(.*))?$/)) break;
            result['domain_url'] = RegExp.$1;
            result['keywords'] = decodeURIComponent(RegExp.$2);
            result['kind'] = RegExp.$3;
            result['asin'] = (RegExp.$4) ? RegExp.$4 : '';
            break;
        }
        return result;
    };  // end of analyze_canonical_url()
    
    var ready = false;
    for (;;) {
        // === 検索フォームの各要素取得
        var elm_searchbar = d.querySelector('form#nav-searchbar') || d.querySelector('form.nav-searchbar[name="site-search"]');
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
        //console.debug(canonical_url_info);
        
        
        // === 著者ページURL → 著者検索ページ URL 変換
        var change_author_url = (function(){
            var kind = canonical_url_info.kind;
            var is_valid = REPLACE_AUTHOR_URL && (kind == 'dp' || kind == 's' || kind == 'e');
            
            if (is_valid) {
                var action = null, source_param_dict = null, field_name = 'field-author';
                var url_part_dict = analyze_url_elm(elm_searchbar);
                var action = url_part_dict.base_url;
                var source_param_dict = url_part_dict.param_dict;
                
                delete(source_param_dict['field-keywords']);
                
                if (!source_param_dict['url']) source_param_dict['url'] = option_search_alias;
                if (!source_param_dict['sort']) source_param_dict['sort'] = option_sort;
                
                if (ADD_UNFILTERED_OPTION) source_param_dict['unfiltered'] = '1';
                
                if (kind == 'dp' && source_param_dict['url'] == 'search-alias=aps') {
                    var action = null, source_param_dict = null, field_name = 'field-author';
                    var links = d.querySelectorAll('a.a-link-normal, div.buying a');
                    for (var ci=0,len=links.length; ci<len; ci++) {
                        var url_part_dict = analyze_url_elm(links[ci]);
                        var param_dict = url_part_dict.param_dict;
                        
                        if (!param_dict['search-alias']) continue;
                        
                        for (var name in param_dict) {
                            if (!param_dict.hasOwnProperty(name)) continue;
                            if (name.match(/^field-/)) {
                                field_name = name;
                                break;
                            }
                        }
                        param_dict['sort'] = option_sort;
                        if (ADD_UNFILTERED_OPTION) param_dict['unfiltered'] = '1';
                        
                        action = url_part_dict.base_url;
                        source_param_dict = param_dict;
                        break;
                    }
                }
            }
            
            return function(author_url){
                var result_url = null;
                for (;;) {
                    if (!is_valid) break;
                    if (!action || !source_param_dict) break;
                    
                    var tmp_param_dict = {};
                    for (var name in source_param_dict) {
                        if (!source_param_dict.hasOwnProperty(name)) continue;
                        tmp_param_dict[name] = source_param_dict[name];
                    }
                    if (author_url) {
                        if (!author_url.match(/\/([^\/]+)\/e\/([^\/]+)/)) break;
                        var author = RegExp.$1;
                        if (author == '-') break;
                        tmp_param_dict[field_name] = tmp_param_dict['text'] = decodeURIComponent(author);
                    }
                    else {
                        if (canonical_url_info.kind != 'e') break;
                        tmp_param_dict[field_name] = canonical_url_info.keywords;
                        // TODO: 'field-author' 以外を考慮する必要はないか？
                    }
                    result_url = join_url({base_url: action, param_dict: tmp_param_dict});
                    break;
                }
                return result_url;
            };
        })();   // end of change_author_url()
        
        
        // === 著者ページのチェック
        var new_url = change_author_url();
        if (new_url && (new_url != w.location.href)) {
            // console.debug('New URL: ' + new_url);
            w.location.replace(new_url);    // 著者ページ→著者検索ページへ遷移
            break;
        }
        
        // === 著者ページへのリンク→著者検索ページへのリンクに変換
        var check_author_links = function(elm) {
            var class_touched = SCRIPT_NAME + '_touched';
            var link_selectors = ['a.a-link-normal', 'div.buying a', 'span.reg a'];
            var link_selector_list = [];
            for (var ci=0,len=link_selectors.length; ci<len; ci++) {
                link_selector_list.push(link_selectors[ci] + ':not(.' + class_touched + ')');
            }
            var links = elm.querySelectorAll(link_selector_list.join(','));
            for (var ci=0, len=links.length; ci<len; ci++) {
                var link = links[ci];
                var new_url = change_author_url(link.href);
                if (new_url && (new_url != link.href)) {
                    link.href = new_url;
                }
                else if (link.href.match(/\/s(?:earch)?[\?\/]/)) {
                    // === 検索ページへのリンク→オプションの付加
                    //link.href = link.href.replace(/([\?&]sort=)[^\?&]+/g, '$1'+encodeURIComponent(option_sort))
                    var url_part_dict = analyze_url_elm(link), param_dict = url_part_dict.param_dict;
                    param_dict['sort'] = option_sort;
                    if (ADD_UNFILTERED_OPTION) param_dict['unfiltered'] = '1';
                    
                    link.href = join_url(url_part_dict);
                }
                link.className += ' ' + class_touched;
            }
        };  //  end of check_author_links()
        
        if (d.addEventListener && d.removeEventListener) {
            if (check_dom_node_inserted) d.removeEventListener('DOMNodeInserted', check_dom_node_inserted, false);
            var check_timer = null;
            check_dom_node_inserted = function(evt){
                if (check_timer) return;
                check_timer = setTimeout(function(){
                    check_author_links(d);
                    check_timer = null;
                }, 300);
            };
            d.addEventListener('DOMNodeInserted', check_dom_node_inserted, false);
        }
        check_author_links(d);
        
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
        
        if (ADD_UNFILTERED_OPTION) {
            // === 検索フォーム内に 'unfiltered' オプション埋め込み
            var elm_unfiltered = elm_searchbar.querySelector('*[name="unfiltered"]');
            if (!elm_unfiltered) {
                elm_unfiltered = d.createElement('input');
                elm_unfiltered.type = 'hidden';
                elm_unfiltered.name = 'unfiltered';
                elm_unfiltered.value = '1';
                elm_searchbar.appendChild(elm_unfiltered);
            }
            // === 並べ替えフォーム内に 'unfiltered' オプション埋め込み
            if (elm_search_sort_form) {
                var elm_sort_unfiltered = elm_search_sort_form.querySelector('*[name="unfiltered"]');
                if (!elm_sort_unfiltered) {
                    elm_sort_unfiltered = elm_unfiltered.cloneNode(true);
                    elm_search_sort_form.appendChild(elm_sort_unfiltered);
                }
            }
        }
        
        if (canonical_url_info.kind) {
            // === 検索結果画面・個別ページ等→パラメータを保存
            localStorage.setItem('search_alias', elm_search_dropdown_box.value);
            if (elm_search_sort) {
                if (w.location.href.match(/[\?&]sort=/)) {
                    // 並び順指定あり→パラメータ保存
                    localStorage.setItem('sort', elm_search_sort.value);
                    elm_sort.value = elm_search_sort.value;
                }
                else {
                    // 並び順指定なし
                    if (elm_search_sort.value != option_sort && elm_search_sort.querySelector('option[value="' + option_sort +'"]')) {
                        // 保存された並び順と異なる→並び順を指定してページ遷移
                        elm_search_sort.value = option_sort;
                        //elm_search_sort_form.submit();
                        var new_url = join_url(analyze_url_elm(elm_search_sort_form));
                        // console.debug('New URL: ' + new_url);
                        w.location.replace(new_url);
                    }
                }
            }
        }
        else {
            // === 検索結果画面・個別ページ等以外→保存パラメータを設定
            elm_search_dropdown_box.value = option_search_alias;
            var span_nav_search_in_content = d.querySelector('span#nav-search-in-content') || d.querySelector('span.nav-search-label');
            var option_element = elm_search_dropdown_box.querySelector('option[value="'+option_search_alias+'"]');
            if (span_nav_search_in_content && option_element) {
                span_nav_search_in_content.textContent = option_element.textContent;
            }
            if (elm_search_sort) {
                elm_search_sort.value = option_sort;
            }
        }
        break;
    }
    return ready;
};  //  end of main()

//}


var ready = main();
if (!ready) return;


// === ページ遷移を検知→メイン処理コール
var pushState = w.history.pushState;
if (pushState && w.addEventListener) {
    w.history.pushState = function(){
        pushState.apply(this, arguments);
        setTimeout(function(){main();}, 1);
        //console.debug('***** pushState() called *****');
        //console.trace();
    };
    w.addEventListener('popstate', function(evt){
        setTimeout(function(){main();}, 1);
        //console.debug('***** event "popstate" *****');
        //console.trace();
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
