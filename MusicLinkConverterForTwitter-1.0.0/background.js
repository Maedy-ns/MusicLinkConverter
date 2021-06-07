const APIResponseStore = {};

//同期版APIを叩く
async function songlinkAPI(expandedURL) {
    try{
        const APIResponse = await fetch("https://api.song.link/v1-alpha.1/links?userCountry=JP&url=" + expandedURL);
        if(APIResponse.ok){
            const json = await APIResponse.json()
            return json;
        }else{
            if(APIResponse.status == 429){
                return {"errorMessage":"リクエストが多すぎます。60秒後に再度実行してください。"};
            }else if(APIResponse.status == 404){
                return {"errorMessage":"リンクを取得できませんでした。"};
            }else if(APIResponse.status.match(/4../)){
                return {"errorMessage":"通信エラーが発生しました。"};
            }else if(APIResponse.status.match(/5../)){
                return {"errorMessage":"サーバーエラーが発生しました。"};
            }else {
                throw new Error("response.ok: " + APIResponse.ok + " status: " + APIResponse.status + "statusText: " + APIResponse.statusText);
            }
        }
    }
    catch(e){
        return {"errorMessage":"通信エラーが発生しました。"};
    }
}

//content_scriptにSonglinkデータを送る
function sendSongLinkData(msg) {
    let artistName = "";
    let title = "";
    let thumbnailUrl = "";
    let linkUrl = "";
    let nativeAppUri = "";
    let platformName = "";

    const lbp = msg.data.linksByPlatform;
    const ebu = msg.data.entitiesByUniqueId;
    switch(msg.targetPlatform) {
        case "spotify":
            if(lbp.spotify) {
                platformName = "Spotify";
                linkUrl = lbp.spotify.url;
                nativeAppUri  = lbp.spotify.nativeAppUriDesktop;
                Object.keys(ebu).forEach(id => {
                    if(id.includes("SPOTIFY")) {
                        artistName = ebu[id].artistName;
                        title = ebu[id].title;
                        thumbnailUrl = ebu[id].thumbnailUrl;
                    }
                });
            }
            break;
        case "appleMusic":
            if(lbp.appleMusic) {
                platformName = "Apple Music";
                linkUrl = lbp.appleMusic.url;
                nativeAppUri  = lbp.appleMusic.nativeAppUriDesktop;
                Object.keys(ebu).forEach(id => {
                    if(id.includes("ITUNES")) {
                        for(let i = 0; i <= ebu[id].platforms.length - 1; i ++) {
                            if(ebu[id].platforms[i] === "appleMusic") {
                                artistName = ebu[id].artistName;
                                title = ebu[id].title;
                                thumbnailUrl = ebu[id].thumbnailUrl;
                            }
                        }
                    }
                });
            }
            break;
        case "amazonMusic":
            if(lbp.amazonMusic) {
                platformName = "Amazon Music";
                linkUrl = lbp.amazonMusic.url.replace("amazon.com","amazon.co.jp");
                nativeAppUri  = lbp.amazonMusic.nativeAppUriDesktop;  //ないかも
                Object.keys(ebu).forEach(id => {
                    if(id.includes("AMAZON")) {
                        for(let i = 0; i <= ebu[id].platforms.length - 1; i ++) {
                            if(ebu[id].platforms[i] === "amazonMusic") {
                                artistName = ebu[id].artistName;
                                title = ebu[id].title;
                                thumbnailUrl = ebu[id].thumbnailUrl;
                            }
                        }
                        
                    }
                });
            }
            break;
    }
    const obj = {"event":"setSonglinkData", "isFound":true, "artistName": artistName, "title": title, "thumbnailUrl": thumbnailUrl, "linkUrl": linkUrl, "nativeAppUri": nativeAppUri, "url": msg.url, "platformName": platformName};
    sendObjToTab(obj);
}

//タブにobjをsendMessageする
function sendObjToTab(obj){
    chrome.tabs.query({ active: true }, function(tabs) {
        for(let i = 0; i <= tabs.length - 1; i++){
            chrome.tabs.sendMessage(tabs[i].id,obj,function(response) {
                if(!chrome.runtime.lastError){
                    i = tabs.length;  //for文を抜ける
                }
            });
        }
    });
}

//expandedURL取得後コールバック
async function reqListener (response,url,targetPlatform) {
    const html = document.createElement('html');
    html.innerHTML = response;
    const title = html.getElementsByTagName('title');
    const expandedURL = arrangeQuery(title[0].innerText);

    if(APIResponseStore[expandedURL]) {
        //すでにレスポンスがあった時
        if(APIResponseStore[expandedURL].data.linksByPlatform[targetPlatform]){
            sendSongLinkData({"data":APIResponseStore[expandedURL].data,"url":url,"targetPlatform":targetPlatform});
        }else{
            reSearchAPI(APIResponseStore[expandedURL],expandedURL);
        }
    }else{
        //なかった時
        //console.log("expandedURL = " + expandedURL);
        //アーティストのアルバムをはじく
        if(/(music\.apple\.com\/.*\/(playlist|artist))|(open\.spotify\.com\/(playlist|artist))|(music\.amazon\..*\/(playlists|artists))/.test(expandedURL)){
            sendObjToTab({"event":"error","message":"アーティスト・プレイリストは変換できません。","url":url});
            return;
        }else if(/(music\.apple\.com\/.*\/album)|(open\.spotify\.com\/(track|album))|(song\.link)|(album\.link)|(music\.amazon\..*\/albums)/.test(expandedURL)) {
            //リンクのプラットフォーム取得
            let json = await songlinkAPI(expandedURL);
            if(json.errorMessage){
                sendObjToTab({"event":"error","message":json.errorMessage,"url":url});
                return;
            }
            const obj = {"data":json,"url":url,"targetPlatform":targetPlatform};
            if(json.linksByPlatform[targetPlatform]){
                sendSongLinkData(obj);
                APIResponseStore[expandedURL] = obj;
            }else{
                reSearchAPI(obj,expandedURL);
            }
        }else{
            sendObjToTab({"event":"error","message":"URLの取得に失敗しました。","url":url});
        }
    }
}

//urlのクエリ文字列の整理
function arrangeQuery(url){
    const questionSplit = url.split("?");
    if(questionSplit.length !== 2){
        return url;
    }
    const base = questionSplit[0];
    const queries = questionSplit[1];
    let trackQuery = "";
    let otherQuery = [];
    const query = queries.split("&");
    query.forEach((q) => {
        const property = q.split("=");
        if(property[0] === "trackAsin"){
            trackQuery = q;
        }else if(property[0] !== "si"){
            otherQuery.push(q);
        }
    });
    if(trackQuery){
        if(otherQuery.length == 0){
            return base + "?" + trackQuery;
        }else{
            return base + "?" + trackQuery + "&" + otherQuery.join("&");
        }
    }else{
        if(otherQuery.length == 0){
            return base;
        }else{
            return base + "?" + otherQuery.join("&");
        }
    }
}

//再検索する
function reSearchAPI(obj,expandedURL) {
    const json = obj.data;
    const url = obj.url;
    const targetPlatform = obj.targetPlatform;
    const platformPromiseArray = [];
    const platformPriority = ["spotify","amazonMusic","youtube","itunes"];

    //platformPriorityの順で再検索
    platformPriority.filter((p) => { 
        if(json.linksByPlatform[p]){
            return json.entityUniqueId != json.linksByPlatform[p].entityUniqueId;
        }
    })
    .forEach((p) => {
        platformPromiseArray.push(searchAPIforPlatform(p));
    })

    //再検索してひとつでも見つかればthen、なければcatch
    Promise.any(platformPromiseArray)
    .then((json) => {
        sendSongLinkData({"data":json,"url":url,"targetPlatform":targetPlatform});
    })
    .catch((e) => {
        if(e instanceof AggregateError){
            (async () => {sendSearchUrl(await getSongTitle(expandedURL));})();
        }else{
            sendObjToTab({"event":"error","message":"エラーが発生しました。"});
            //console.error("unexpected error.");
            //console.error(e.message);
        }
    });

    //全て解決した後jsonをstoreする
    Promise.allSettled(platformPromiseArray)
    .then((responseArray) => {
        responseArray.forEach((response) => {
            //１回目のresponseと2回目（再検索時）のresponseを合体
            const json = (response.status == "fulfilled") ? response.value : response.reason;
            Object.keys(json.entitiesByUniqueId).forEach((key) => {
                if(!Object.keys(obj.data.entitiesByUniqueId).includes(key)){
                    obj.data.entitiesByUniqueId[key] = json.entitiesByUniqueId[key];
                }
            });
            if(typeof obj.data.entityUniqueId === "string"){
                obj.data.entityUniqueId = [obj.data.entityUniqueId];
                obj.data.entityUniqueId.push(json.entityUniqueId);
            }else{
                obj.data.entityUniqueId.push(json.entityUniqueId);
            }
            Object.keys(json.linksByPlatform).forEach((key) => {
                if(!Object.keys(obj.data.linksByPlatform).includes(key)){
                    obj.data.linksByPlatform[key] = json.linksByPlatform[key];
                }
            });
        });
        APIResponseStore[expandedURL] = obj;
    })
    
    //APIを叩いて再検索するPromise
    function searchAPIforPlatform(platform){
        return new Promise((resolve,reject) => {
            songlinkAPI(json.linksByPlatform[platform].url).then((json) => {
                if(json.errorMessage){
                    sendObjToTab({"event":"error","message":json.errorMessage,"url":url});
                    return;
                }
                if(json.linksByPlatform[targetPlatform]){
                    resolve(json);
                }else{
                    reject(json);
                }
            })
        });
    }
    
    //見つからなかった時に検索用URLを送信
    function sendSearchUrl(title) {
        let searchUrl = "";
        let platformName = "";
        const encodedtitle = encodeURIComponent(title);
        switch(targetPlatform){
            case "spotify":
                searchUrl = "https://open.spotify.com/search/" + encodedtitle;
                platformName = "Spotify";
                break;
            case "appleMusic":
                searchUrl = "https://music.apple.com/jp/search?term=" + encodedtitle;
                platformName = "Apple Music";
                break;
            case "amazonMusic":
                searchUrl = "https://music.amazon.co.jp/search/" + encodedtitle;
                platformName = "Amazon Music";
                break;
        }
        const obj = {"event":"setSonglinkData", "isFound":false, "title":title, "url":url, "searchUrl":searchUrl, "platformName":platformName};
        sendObjToTab(obj);
    }
    
    //見つからなかった時にタイトルを取得
    function getSongTitle() {
        return new Promise((resolve,reject) => {
            if(expandedURL.includes("amazon")){
                const ebuKeys = Object.keys(obj.data.entitiesByUniqueId);
                for(let i = 0; i <= ebuKeys.length -1; i++){
                    if(ebuKeys[i].includes("AMAZON")){
                        resolve(obj.data.entitiesByUniqueId[ebuKeys[i]].title);
                        return;
                    }
                }
                reject("ebuKeys:AMAZON_ALBUMが見つかりませんでした。");
            }else{
                fetch(expandedURL)
                .then((response) => {
                    response.text()
                    .then((text) => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(text, "text/html");
                        const metaDiscre = doc.head.children;
                        const l = metaDiscre.length;
                        for(let i = 0;i <= l-1; i++){
                            if(metaDiscre[i].getAttribute('name') === 'apple:title'||metaDiscre[i].getAttribute('property') === 'og:title'){
                                const songTitle = metaDiscre[i].getAttribute('content');
                                resolve(songTitle);
                            }
                        }
                    });
                });
            }
        });
    }

}

//targetPlatformを同期的に取得し返す
function getTargetPlatform() {
    return new Promise((resolve,reject) => {
        chrome.storage.local.get(['targetPlatform'], (result) => {
            if(result["targetPlatform"]){
                resolve(result["targetPlatform"]);
            }else{
                reject("noTargetPlatform");
            }
        });
    });
}

//イベントリスナー
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    switch(msg.event) {
        case "startAPI":
            (async () => {
                //console.log("URL = " + msg.url);
                var targetPlatform = await getTargetPlatform()
                .catch((reason) => {
                    return reason;
                });
                if(targetPlatform == "noTargetPlatform"){
                    sendObjToTab({"event":"error","message":"<a class='convertedOpenOption'>オプションページ</a>から変換先のサービスを選択してください。","url":msg.url})
                    return;
                }
                const responseKey = Object.keys(APIResponseStore).find(key => {
                    try{
                        return (APIResponseStore[key].url === msg.url)
                    }catch(e){
                        //console.error(e.message);
                    }
                });
                if(responseKey) {
                    if(Object.keys(APIResponseStore[responseKey].data.linksByPlatform).includes(targetPlatform)){
                        sendSongLinkData({"data":APIResponseStore[responseKey].data,"url":msg.url,"targetPlatform":targetPlatform});
                        return;
                    }else{
                        reSearchAPI(APIResponseStore[responseKey],responseKey);
                        return;
                    }
                }else{
                    try{
                        var oReq = new XMLHttpRequest();
                        oReq.open("GET", msg.url);
                        oReq.send();
                        oReq.onload = function() {
                            try{
                                reqListener(this.response,msg.url,targetPlatform,sender.tab.id);
                            }catch(e){
                                sendObjToTab({"event":"error","message":"エラーが発生しました。","url":msg.url});
                            }
                        };
                        oReq.onerror = function() {
                            sendObjToTab({"event":"error","message":"通信に失敗しました。","url":msg.url});
                        };
                        return;
                    }catch(e){
                        sendObjToTab({"event":"error","message":"","url":msg.url})
                    }
                }
            })();
            sendResponse("gettingSongLink... URL: " + msg.url);
            break;
        case "setTargetPlatform":
            chrome.storage.local.set({"targetPlatform": msg.targetPlatform}, function() {
                //console.log('Value is set to ' + msg.targetPlatform);
              });
            sendResponse("targetPlatform is set to: " + msg.targetPlatform);
            break;
        case "openOption":
            chrome.runtime.openOptionsPage();
            sendResponse("open OptionPage.");
            break;
    }
});
