const timerId = {};
const elems = {};

//TLのツイート本文内の音楽リンクを検知
//const TLtweetTextSelector = '.css-901oao.r-18jsvk2.r-1tl8opc.r-a023e6.r-16dba41.r-ad9z0x.r-bcqeeo.r-bnwqim.r-qvutc0 > a';
const TLtweetTextSelector = '[data-testid="tweet"] > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > a';
const TLtextRegExp = /(music\.apple\.com\/.*\/album)|(open\.spotify\.com\/(track|album))|(music\.amazon\..*\/albums)|(song\.link)|(album\.link)/;
$("body").on('mouseenter',TLtweetTextSelector,function(e) {
    const url = e.currentTarget.innerText.replace("…","");
    //既に同じURLのBoxがあれば処理しない
    const shortenedURL = e.currentTarget.href;
    for(let i = 0; i <= e.currentTarget.parentNode.children.length-1; i++) {
        if(e.currentTarget.parentNode.children[i].dataset.href == shortenedURL){
            return;
        }
    }try{
        const cardWrapper = e.currentTarget.parentNode.parentNode.parentNode.children[1].firstChild.firstChild.firstChild.children;
        for(let i = 0; i <= cardWrapper.length-1; i++) {
            if(cardWrapper[i].dataset.href == shortenedURL){
                return;
            }
        }
    }catch(e){
        //console.log(e.message);
    }
    if(TLtextRegExp.test(url)) {
        timerId[url] = setTimeout(showBox,500,e.currentTarget,"text");
    }
});
$('body').on('mouseleave',TLtweetTextSelector,function(e) {
    const url = e.currentTarget.innerText.replace("…","");
    clearTimeout(timerId[url]);
    timerId[url] = null;
});

//音楽サービスのカードを検知
const cardWrapperSelector = '[data-testid="card.wrapper"]';
const cardRegExp = /(music\.apple\.com)|(open\.spotify\.com)|(music\.amazon)|(song\.link)|(album\.link)/;
$("body").on('mouseenter',cardWrapperSelector,function(e) {
    setTimeout(function() {
        const cardLink = e.currentTarget.firstChild.firstChild.href;

        //既に同じURLのBoxがあれば処理しない
        for(let i = 0; i <= e.currentTarget.parentNode.children.length-1; i++) {
            if(e.currentTarget.parentNode.children[i].dataset.href == cardLink){
                return;
            }
        }
        const tweetTextParent = e.currentTarget.parentNode.parentNode.parentNode.parentNode.parentNode.firstChild.firstChild;
        if(tweetTextParent){
            for(let i = 0; i <= tweetTextParent.children.length-1; i++) {
                if(tweetTextParent.children[i].dataset.href == cardLink){
                    return;
                }
            }
        }

        if(containsMusicUrl(e.currentTarget)) {
            timerId[cardLink] = setTimeout(showBox,500,e.currentTarget,"card");
        }
    },5);
});
$("body").on('mouseleave',cardWrapperSelector,function(e) {
    const cardLink = e.currentTarget.firstChild.firstChild.href;
    clearTimeout(timerId[cardLink]);
    timerId[cardLink] = null;
});

//単体ツイートの音楽URLを検知
const tweetTextSelector = '.css-901oao.r-18jsvk2.r-1tl8opc.r-1blvdjr.r-16dba41.r-ad9z0x.r-bcqeeo.r-bnwqim.r-qvutc0 > a, .css-901oao.r-18jsvk2.r-1qd0xha.r-1blvdjr.r-16dba41.r-ad9z0x.r-bcqeeo.r-bnwqim.r-qvutc0 > a';
const textRegExp = /(music\.apple\.com\/.*\/album)|(open\.spotify\.com\/(track|album))|(music\.amazon\..*\/albums)|(song\.link)|(album\.link)/;
$("body").on('mouseenter',tweetTextSelector,function(e) {
    const url = e.currentTarget.innerText.replace("…","");
    //既に同じURLのBoxがあれば処理しない
    const shortenedURL = e.currentTarget.href;
    for(let i = 0; i <= e.currentTarget.parentNode.children.length-1; i++) {
        if(e.currentTarget.parentNode.children[i].dataset.href == shortenedURL){
            return;
        }
    }try{
        const cardWrapper = e.currentTarget.parentNode.parentNode.parentNode.parentNode.children[1].firstChild.firstChild.firstChild.children;
        for(let i = 0; i <= cardWrapper.length-1; i++) {
            if(cardWrapper[i].dataset.href == shortenedURL){
                return;
            }
        }
    }catch(e){
        //console.log(e.message);
    }
    if(textRegExp.test(url)) {
        timerId[url] = setTimeout(showBox,500,e.currentTarget,"text");
    }
});
$('body').on('mouseleave',tweetTextSelector,function(e) {
    const url = e.currentTarget.innerText.replace("…","");
    clearTimeout(timerId[url]);
    timerId[url] = null;
});

//onOptionsPageのonclick属性付与
const openOptionSelector = '.convertedOpenOption';
$("body").on('click',openOptionSelector,function(e) {
    const obj = {"event":"openOption"};
    console.log(e.currentTarget.parentNode);
    try{
        chrome.runtime.sendMessage(obj, function(response) {
            //console.log(response);
        });
    }catch(e){
        e.currentTarget.parentNode.innerHTML = "読み込みエラー：ブラウザを更新してください。";
    }
});

//カードのlinkに音楽URLが含まれているかどうか
function containsMusicUrl(card) {
    const linkChildren = card.parentNode.children;
    for(let i = 0; i<= linkChildren.length-1;i++) {
        if(!linkChildren[i].href) {
            continue;
        } else if(cardRegExp.test(linkChildren[i].href)) {
            return true;
        }
    }
    return false;
}

//Boxが出現する
function showBox(target,type) {
    var elem = document.createElement('div');
    elem.className = "converted";
    elem.style.opacity = 0;
    const bgcolor = document.body.style.backgroundColor;
    const [red,green,blue] = bgcolor.match(/[0-9]+/g);
    if(!red){
        elem.style.color = "#191414";
    }else if(red > 100 && green > 100 && blue > 100) {
        elem.style.color = "#191414";
    }else{
        elem.style.color = "#d9d9d9";
    }
    target.parentNode.append(elem);
    setTimeout(setOpacity,0);
    let targetURL = "";
    if(type === "text") {
        targetURL = target.href
    }else if(type === "card") {
        targetURL = target.firstChild.firstChild.href;
    }
    if(!targetURL) {
        //console.log("予期しないタイプ: " + type);
        elem.innerHTML = "タイプ初期化エラーが発生しました。";
        return;
    }
    elem.dataset.href = targetURL;
    elems[targetURL] = elem;

    try{
        chrome.storage.local.get(['targetPlatform'], (result) => {
            if(result["targetPlatform"] == "spotify"){
                elem.style.border = "solid 2px #1DB954";
            }else if(result["targetPlatform"] == "appleMusic"){
                elem.style.border = "solid 2px #fc5c74";
            }else if(result["targetPlatform"] == "amazonMusic"){
                elem.style.border = "solid 2px #4404fc";
            }else{
                elem.style.border = "solid 2px #191414";
            }
        });
        sendStartAPIMsg(targetURL);
        elem.innerHTML = "読み込み中";
    }catch(e){
        elem.innerHTML = "読み込みエラー：ブラウザを更新してください。";
        return;
    }

    function setOpacity() {
        elem.style.opacity = 1;
    }
}

//optionページを開く
function openOptionOnBG(){
}

//Backgroundにurlを送信
function sendStartAPIMsg(url) {
    const obj = {"event":"startAPI", "url": url};
    chrome.runtime.sendMessage(obj, function(response) {
        //console.log(response);
    });
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    const elem = elems[msg.url];
    if(!elem) {
        //console.error("url: " + url + " の表示先がありません。");
        sendResponse("received at noElem");
        return;
    }
    switch(msg.event){
        case "setSonglinkData":
            if(msg.isFound){
                const artistName = msg.artistName;
                const title = msg.title;
                const thumbnailUrl = msg.thumbnailUrl;
                const linkUrl =  msg.linkUrl;
                const nativeAppUri = msg.nativeAppUri;
                const url = msg.url;
                const platformName = msg.platformName;
    
                if(platformName == "Spotify"){
                    var a = document.createElement('a');
                    a.className = "convertedSpotifyA";
                    a.href = linkUrl;
                    a.target = "_blank";
                    var img = document.createElement('img');
                    img.src = "moz-extension://" + chrome.runtime.id + "/resources/Spotify_Icon_RGB_Green.png";
                    img.className = "spotifyLogo";
                    img.onload = () => {console.log("あった");};
                    //img.onerror = () => {console.log("なかった"); img.src = "moz-extension://" + chrome.runtime.id + "/resources/Spotify_Icon_RGB_Green.png";};
                    a.appendChild(img);
                    var span = document.createElement('span');
                    span.textContent = artistName + " / " + title;
                    a.appendChild(span);
                    elem.innerHTML = "";
                    elem.appendChild(a);
                    //elem.innerHTML = "<a href='" + linkUrl + "'  target='_blank' class='convertedSpotifyA'><img class='spotifyLogo' src='chrome-extension://" + chrome.runtime.id + "/resources/Spotify_Icon_RGB_Green.png'><span class='convertedCredit'>" + artistName + " / " + title +"</span></a>";
                }else if(platformName == "Apple Music"){
                    elem.innerHTML = "<a href='" + linkUrl + "'  target='_blank' class='convertedAppleMusicA'>[" + platformName + "で開く]<span class='convertedCredit'>" + artistName + " / " + title +"</span></a>";
                }else if(platformName == "Amazon Music"){
                    elem.innerHTML = "<a href='" + linkUrl + "'  target='_blank' class='convertedAmazonMusicA'>[" + platformName + "で開く]<span class='convertedCredit'>" + artistName + " / " + title +"</span></a>";
                }
                
                
                
                sendResponse("received at isFoundTrue");
                break;
            }else if(!msg.isFound){
                elem.innerHTML = "リンクが見つかりませんでした。<br><a href ='" + msg.searchUrl +"' target='_blank'>" + msg.platformName + "で「" + msg.title + "」を検索</a>";
                sendResponse("received at isFoundFalse");
                break;
            }
        case "error":
            elem.innerHTML = msg.message;
            sendResponse("received at error");
            setTimeout((() => {elem.style.opacity = 0;}),8000);
            setTimeout((() => {elem.remove();}),9000);
            break;
        default:
            //console.error("イベント: " + msg.event + " の遷移先がありません。");
            sendResponse("received at default");
            break;
    }
});