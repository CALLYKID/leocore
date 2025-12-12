const chatScreen = document.getElementById("chatScreen");
const fakeInput = document.getElementById("fakeInput");
const fakeText = document.getElementById("fakeText");
const closeChat = document.getElementById("closeChat");
const messages = document.getElementById("messages");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const modePill = document.getElementById("modePill");

const prompts = [
  "Message LeoCore…",
  "Help me revise.",
  "I'm ready.",
  "Let's work."
];

let pi=0, ci=0, del=false;
function typeLoop(){
  const t = prompts[pi];
  fakeText.textContent = del ? t.slice(0,--ci) : t.slice(0,++ci);
  if(ci===t.length+1){ del=true; setTimeout(typeLoop,900); return;}
  if(ci<0){ del=false; pi=(pi+1)%prompts.length;}
  setTimeout(typeLoop, del?50:70);
}
typeLoop();

/* OPEN / CLOSE */
function openChat(){
  chatScreen.classList.add("active");
}
function closeChatUI(){
  chatScreen.classList.remove("active");
}

fakeInput.onclick = openChat;
closeChat.onclick = closeChatUI;

/* MODES */
document.querySelectorAll(".mode-btn").forEach(b=>{
  b.onclick=()=>{
    localStorage.setItem("mode", b.dataset.mode);
    modePill.textContent = b.dataset.mode.toUpperCase().slice(0,4);
    openChat();
  };
});

/* CHAT */
function addMessage(text, sender){
  const wrap = document.createElement("div");
  wrap.className = sender+"-msg";
  const bubble = document.createElement("div");
  bubble.className="bubble";
  bubble.textContent=text;
  wrap.appendChild(bubble);
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

sendBtn.onclick=()=>{
  if(!input.value.trim())return;
  addMessage(input.value,"user");
  addMessage("Thinking…","ai");
  input.value="";
};
