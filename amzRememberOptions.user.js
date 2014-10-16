// ==UserScript==
// @name           amzRememberOptions
// @namespace      http://d.hatena.ne.jp/furyu-tei
// @include        http://www.amazon.co.jp/*
// @include        https://www.amazon.co.jp/*
// @description    remember search options for Amazon.co.jp (ver.0.1.0.0)
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

var DEFAULT_SEARCH_ALIAS = 'search-alias=stripbooks';   //  select#searchDropdownBox
var DEFAULT_SORT = 'date-desc-rank';    //  select#sort

var REPLACE_AUTHOR_URL = true;

var main = function(){
    var ready = false;
    for (;;) {
        var elm_searchbar = d.querySelector('form#nav-searchbar');
        if (!elm_searchbar) break;
        
        var elm_textbox = elm_searchbar.querySelector('input#twotabsearchtextbox') || elm_searchbar.querySelector('*[name="field-keywords"]');
        if (!elm_textbox) break;
        
        var elm_search_dropdown_box = d.querySelector('select#searchDropdownBox') || elm_searchbar.querySelector('*[name="url"]');
        if (!elm_search_dropdown_box) break;
        
        ready = true;
        
        var option_search_alias = localStorage.getItem('search_alias');
        var option_sort = localStorage.getItem('sort');
        if (!option_search_alias) option_search_alias = DEFAULT_SEARCH_ALIAS;
        if (!option_sort) option_sort = DEFAULT_SORT;
        
        var change_author_url = (function(){
            var action = elm_searchbar.action;
            var elm_inputs = elm_searchbar.querySelectorAll('*[name]');
            var source_query_list = [], ignore_name_dict = {'field-keywords':true, 'url':true, 'sort':true};
            for (var ci=0, len=elm_inputs.length; ci < len; ci++) {
                var elm_input = elm_inputs[ci];
                if (ignore_name_dict[elm_input.name]) continue;
                source_query_list.push(elm_input.name + '=' + encodeURIComponent(elm_input.value));
            }
            source_query_list.push('url=' + encodeURIComponent(option_search_alias));
            source_query_list.push('sort=' + encodeURIComponent(option_sort));
            
            //var is_valid = !!(elm_search_dropdown_box.value.match(/(?:books|digital-text)$/)) && REPLACE_AUTHOR_URL;
            var is_valid = REPLACE_AUTHOR_URL;
            return function(author_url){
                if (!is_valid || !author_url.match(/\/([^\/]+)\/e\/[^\/]+\/ref=/)) return author_url;
                var author = decodeURIComponent(RegExp.$1);
                var query_list = source_query_list.slice(0);
                query_list.push('field-author=' + encodeURIComponent(author));
                return action + '?' + query_list.join('&');
            };
        })();   // end of change_author_url()
        
        var new_url = change_author_url(w.location.href);
        if (new_url != w.location.href) {
            w.location.replace(new_url);
            break;
        }
        var links = d.querySelectorAll('div#byline span.author a.a-link-normal, div.buying a');
        for (var ci=0, len=links.length; ci<len; ci++) {
            var link = links[ci];
            var new_url = change_author_url(link.href);
            if (new_url == link.href) {
                link.href = link.href.replace(/([\?&]sort=)[^\?&]+/g, '$1'+encodeURIComponent(option_sort))
            }
            else {
                link.href = new_url;
            }
        }
        
        var elm_sort = elm_searchbar.querySelector('*[name="sort"]');
        if (!elm_sort) {
            var elm_sort = d.createElement('input');
            elm_sort.type = 'hidden';
            elm_sort.name = 'sort';
            elm_searchbar.appendChild(elm_sort);
        }
        elm_sort.value = option_sort;
        
        var replace_url = false;
        for (;;) {
            var elm_search_sort_form = d.querySelector('form#searchSortForm');
            if (!elm_search_sort_form) break;
            var elm_search_sort = elm_search_sort_form.querySelector('select#sort') || elm_search_sort_form.querySelector('*[name="sort"]');
            if (!elm_search_sort) break;
            
            if (w.location.href.match(/[&\?]sort=.+/)) {
                localStorage.setItem('sort', elm_search_sort.value);
                elm_sort.value = elm_search_sort.value;
            }
            else {
                elm_search_sort.value = option_sort;
                elm_search_sort_form.submit();
                replace_url = true;
            }
            break;
        }
        if (replace_url) break;
        
        if (elm_textbox.value) {
            localStorage.setItem('search_alias', elm_search_dropdown_box.value);
            break;
        }
        elm_search_dropdown_box.value = option_search_alias;
        d.querySelector('span#nav-search-in-content').textContent = elm_search_dropdown_box.querySelector('option[value="'+option_search_alias+'"]').textContent;
        break;
    }
    return ready;
};  //  end of main()

var ready = main();
if (!ready) return;

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
