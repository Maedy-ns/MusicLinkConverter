const form = document.getElementById("radio");
const radio = form.platform;

chrome.storage.local.get(['targetPlatform'], function(result) {
    if(result["targetPlatform"]) {
        const targetRadio = document.getElementById(result["targetPlatform"]);
        targetRadio.checked = true;
        console.log('Value currently is ' + result["targetPlatform"]);
    }
});

//それぞれのラジオボタンにonchange属性を設定する
radio.forEach((btn) => { btn.onchange = changeTargetPlatform });
function changeTargetPlatform() {
    const obj = {"event":"setTargetPlatform","targetPlatform":radio.value};
    chrome.runtime.sendMessage(obj, function(response) {
        console.log(response);
    });
}