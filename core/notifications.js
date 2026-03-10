import dingTalk from "./dingtalk-webhook.js";


/**
 * event="debug" | "default"
 */
export function notify(event,message) {
    if(event==="debug"){
        console.log(message);
    }
    if(event==="default"){
        console.log(message);
        dingTalk(message);
    }
}
