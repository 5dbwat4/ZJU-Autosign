import dingTalk from "./dingtalk-webhook.js";


/**
 * event="debug" | "default"
 */
export function notify(event,message) {
    if(event==="debug"){
        console.log(message);
        return Promise.resolve();
    }
    if(event==="default"){
        console.log(message);
        return dingTalk(message);
    }
    return Promise.resolve();
}
