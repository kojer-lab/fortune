(function(){
"use strict";
const $=id=>document.getElementById(id);
const D=window.JP_FORTUNE_DATA;
const key="daily-fortune-profile-v1";
const zodiac=["ねずみ","うし","とら","うさぎ","たつ","へび","うま","ひつじ","さる","とり","いぬ","いのしし"];
const signs=["やぎ座","みずがめ座","うお座","おひつじ座","おうし座","ふたご座","かに座","しし座","おとめ座","てんびん座","さそり座","いて座"];
const mark=["♑","♒","♓","♈","♉","♊","♋","♌","♍","♎","♏","♐"];
const limits=[20,19,21,20,21,22,23,23,23,23,22,22];
const slots=["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const stems="甲乙丙丁戊己庚辛壬癸", branches="子丑寅卯辰巳午未申酉戌亥";
const stemYomi=["きのえ","きのと","ひのえ","ひのと","つちのえ","つちのと","かのえ","かのと","みずのえ","みずのと"];
const branchYomi=["ね","うし","とら","う","たつ","み","うま","ひつじ","さる","とり","いぬ","い"];
let person=null, derived=null, offset=0, active="today", fontLarge=false, lastDay="", latest=null;
function hidden(id,v){$(id).hidden=v;}
function write(id,txt){$(id).textContent=txt;}
function fill(id,paras){
  const target=$(id);target.replaceChildren();
  for(const p of paras){const node=document.createElement("p");node.textContent=p;if(p.startsWith("⚠️"))node.className="caution-paragraph";target.appendChild(node);}
}
function pick(arr,day,mul,seed){return arr[((day*mul+seed)%arr.length+arr.length)%arr.length];}
function signFor(m,d){const index=(m-1+(d>=limits[m-1]?1:0))%12;return{name:signs[index],icon:mark[index]};}
function chartYomi(pair){
  if(!pair||pair==="—")return"時間未登録";
  const a=stems.indexOf(pair[0]),b=branches.indexOf(pair[1]);
  return(a<0?"":stemYomi[a])+(b<0?"":branchYomi[b]);
}
function profileCalc(p){
  const y=Number(p.year),m=Number(p.month),d=Number(p.day);
  if(!Number.isInteger(y)||y<1900||y>2099||!Number.isInteger(m)||m<1||m>12||!Number.isInteger(d)||d<1||d>31)
    throw Error("正しい生年月日を入力してください。");
  const known=p.branch!==""&&p.branch!==undefined&&p.branch!==null;
  const branch=known?Number(p.branch):null;
  if(known&&(!Number.isInteger(branch)||branch<0||branch>11))throw Error("出生時間を確認してください。");
  const hr=known?branch*2:12;
  let sy=y,sm=m,sd=d,chart=null;
  if(p.calendar==="lunar"){
    if(typeof Lunar==="undefined"||typeof Solar==="undefined")throw Error("旧暦の計算データを読み込めません。インターネット接続をご確認ください。");
    let converted;
    try{
      converted=Lunar.fromYmdHms(y,p.leap?-m:m,d,hr,0,0).getSolar();
      const back=converted.getLunar();
      if(back.getYear()!==y||back.getMonth()!==(p.leap?-m:m)||back.getDay()!==d)throw Error("旧暦の日付が正しくありません。");
    }catch(e){throw Error("旧暦の日付と閏月を確認してください。");}
    sy=converted.getYear();sm=converted.getMonth();sd=converted.getDay();
  }else{
    const test=new Date(Date.UTC(y,m-1,d));
    if(test.getUTCFullYear()!==y||test.getUTCMonth()+1!==m||test.getUTCDate()!==d)throw Error("実在しない日付です。月と日をご確認ください。");
  }
  if(typeof Solar!=="undefined"&&typeof Lunar!=="undefined"){
    try{
      const eight=Solar.fromYmdHms(sy,sm,sd,hr,0,0).getLunar().getEightChar();
      chart={year:eight.getYear(),month:eight.getMonth(),day:eight.getDay(),time:known?eight.getTime():null};
    }catch(e){chart=null;}
  }
  const animalIndex=chart?branches.indexOf(chart.year[1]):((sy-2020)%12+12)%12;
  return {year:sy,month:sm,day:sd,chart,animal:zodiac[animalIndex]||"",sign:signFor(sm,sd),known,branch,
    hourName:known?slots[branch]+"の刻":""};
}
function initProfile(){
  try{
    const saved=localStorage.getItem(key);
    if(saved){
      const parsed=JSON.parse(saved),calc=profileCalc(parsed);
      person=parsed;derived=calc;
      $("personName").value=parsed.name||"";
      $("calendarType").value=parsed.calendar||"solar";
      $("birthYear").value=parsed.year;
      $("birthMonth").value=parsed.month;
      $("birthDay").value=parsed.day;
      $("birthBranch").value=parsed.branch===null||parsed.branch===undefined?"":String(parsed.branch);
      $("lunarLeap").checked=!!parsed.leap;
    }
  }catch(e){person=null;derived=null;}
  hidden("leapWrap",$("calendarType").value!=="lunar");
  if(!person)$("profileEditor").open=true;
  drawProfile();
}
function drawProfile(){
  document.documentElement.classList.toggle("profile-ready",!!person);
  if(!person){
    write("profileSummary","生年月日を入力すると運勢がその方に合わせて変わります。未登録の場合は、どなたでも読める一般向けの運勢です。");
    hidden("personalSigns",true);
  }else{
    write("profileSummary",(person.name?person.name+"さんの":"あなたの")+"運勢 · "+person.year+"年"+person.month+"月"+person.day+"日（"+(person.calendar==="lunar"?"旧暦":"新暦")+"） · "+derived.animal+"年 · "+derived.sign.name);
    hidden("personalSigns",false);
  }
  updateSaju();
}
function updateSaju(){
  const ready=!!person&&!!derived&&!!derived.chart;
  hidden("sajuContent",!ready);
  if(!person){write("sajuHeading","あなたの四柱推命");write("sajuIntro","上の入力欄から生年月日を登録してください。");
    write("sajuWarning","生年月日を登録すると四柱推命を計算します。出生時間が不明なときは、時柱を空欄にします。");return;}
  if(!ready){
    write("sajuHeading","命式を計算できませんでした");
    write("sajuIntro","毎日の運勢と年の読み物は引き続きご覧いただけます。");
    write("sajuWarning","暦の計算に必要なデータを読み込めませんでした。通信環境を確認して、ページを再度開いてください。確かめられない命式は表示しません。");return;
  }
  const chart=derived.chart,story=D.stems[chart.day[0]];
  const pairs=[["Year",chart.year],["Month",chart.month],["Day",chart.day],["Time",chart.time]];
  pairs.forEach(([name,val])=>{write("pillar"+name,val||"—");write("pillar"+name+"Yomi",chartYomi(val));});
  write("sajuHeading",story?story[0]:"あなたの四柱推命");
  write("sajuIntro",derived.animal+"年・"+derived.sign.name+"・"+(derived.known?derived.hourName:"出生時間不明")+"の情報から読む、伝統的な命式のお話です。");
  write("sajuCore","生まれた日の柱は「"+chart.day+"」です。最初の文字を日干と呼び、自然の象徴として読み解きます。");
  write("stemHeading",story?"🌳 "+story[0]:"🌳 日干の物語");
  fill("stemStory",story?[story[1],story[2],"これらの象徴は科学的な性格判断や未来の予言ではありません。伝統的な読み物としてお楽しみください。"]:["伝統的な自然の象徴を楽しむための読み物です。"]);
  write("sajuWarning","📖 命式は出生時刻の代表値で計算しています。節気の境目や出生地、サマータイム、子の刻の日付の扱いで計算が異なることがあります。詳しい鑑定には専門家による確認が必要です。");
}
function renderYears(){
  for(const y of [2026,2027]){
    const d=D.years[y],panel=$("panel-y"+y);
    const cards=d.cards.map((x,i)=>{const a=document.createElement("article");a.className="fortune-card";const h=document.createElement("h3");h.textContent=["🌷 ","🌿 ","💰 ","💗 "][i]+x[0];const p=document.createElement("p");p.textContent=x[1];a.append(h,p);return a;});
    const cardRegion=panel.querySelector(".yearCards");cardRegion.replaceChildren(...cards);
    fill("yearWarning"+y,D.annualCautions[y]);
    fill("intro"+y,d.intro);
    D.months[y].forEach((x,i)=>{
      const det=document.createElement("details");det.className="month";
      const summary=document.createElement("summary");summary.textContent=(i+1)+"月 · "+x[0];
      const content=document.createElement("div");content.className="month-inner";
      for(let j=1;j<=2;j++){const p=document.createElement("p");p.textContent=x[j];content.appendChild(p);}
      if((i+1)%3===0){const caution=document.createElement("p");caution.className="month-caution";caution.textContent=D.quarterCautions[Math.floor(i/3)];content.appendChild(caution);}
      const tip=document.createElement("p");tip.className="tip";tip.textContent="🌷 今月の小さな楽しみ： "+x[3];content.appendChild(tip);
      det.append(summary,content);panel.querySelector(".months").appendChild(det);
    });
  }
}
function nowJapan(){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const p={};parts.forEach(v=>p[v.type]=v.value);
  return p.year+"-"+p.month+"-"+p.day;
}
function currentDate(){
  const d=new Date(nowJapan()+"T12:00:00+09:00");d.setUTCDate(d.getUTCDate()+offset);
  return d;
}
function dateKey(d){return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0");}
function renderToday(){
  const d=currentDate(),keyText=dateKey(d);
  const month=d.getUTCMonth()+1,day=d.getUTCDate(),year=d.getUTCFullYear();
  const dayNo=Math.floor(d.getTime()/86400000);
  const seed=person?Number(person.year)*372+Number(person.month)*31+Number(person.day)+(derived.known?derived.branch:0):2931;
  const subject=pick(D.daily.overall,dayNo,13,seed);
  const overallParagraphs=[...subject.slice(1),pick(D.cautions.overall,dayNo,11,seed+27)];
  write("dateDisplay",year+"年"+month+"月"+day+"日（"+["日","月","火","水","木","金","土"][d.getUTCDay()]+"）");
  write("dailyTitle",subject[0]);
  fill("dailyOverall",overallParagraphs);
  const topics=[["health","dailyHealth"],["money","dailyMoney"],["family","dailyFamily"],["luck","dailyLuck"]];
  const firstCaution=((dayNo%4)+4)%4,secondCaution=(firstCaution+2)%4;
  for(let i=0;i<topics.length;i++){
    const category=topics[i][0];
    const reading=[...pick(D.daily[category],dayNo,5+i*2,seed+i*7)];
    if(i===firstCaution||i===secondCaution)reading.push(pick(D.cautions[category],dayNo,17+i*2,seed+43+i*19));
    fill(topics[i][1],reading);
  }
  write("dailyStoryTitle",subject[0]+" 〜 一日を楽しむために");
  fill("dailyStory",[
    "今日の小さな目標は、大きな成果ではなく、気分が明るくなる瞬間を見つけることです。何気ない会話やいつもの道の景色も、あとで思い出すと大切な記憶になっていることがあります。",
    "慌てずに一つずつ過ごしましょう。うまくいかないことがあっても、今まで積み重ねた時間が消えるわけではありません。自分にもやさしい言葉をかけてください。",
    "夜には、今日よかったことを一つだけ思い出してみてください。特別な出来事がなくても、穏やかに過ごせたことを喜んでいいのです。"
  ]);
  write("dailyTip","🍵 今日の小さな楽しみ： "+pick(["好きなお茶をゆっくり味わう","家族に温かなひと言を伝える","懐かしい音楽を一曲聴く","気に入った景色を写真に残す","今日よかったことを一行書く"],dayNo,3,seed));
  if(derived){
    write("animalTitle","🐾 "+derived.animal+"年のお話");
    fill("animalText",[
      derived.animal+"年には伝統的な十二支の象徴があります。生まれた年の動物は話題のきっかけにはなりますが、すべての性格が決まるものではありません。",
      "今日の暮らしの中で好きなことを一つ楽しみ、自分の歩幅で過ごしましょう。家族との何げない会話も大切な時間です。"
    ]);
    write("signTitle",derived.sign.icon+" "+derived.sign.name+"のお話");
    fill("signText",[
      derived.sign.name+"は西洋の星座文化にある十二の星座の一つです。自分を知るためのちょっとした物語として楽しんでみましょう。",
      "新しい知識を得ることも、昔から好きなことをゆっくり楽しむことも素敵です。今日の気分に合わせて選んでみてください。"
    ]);
    hidden("timeTextBlock",!derived.known);
    if(derived.known){
      write("timeTitle","🌤️ "+derived.hourName+"のお話");
      fill("timeText",[
        "生まれた時間の名前には、一日の移り変わりと自然のイメージが込められています。"+derived.hourName+"という言葉を、小さな読み物として楽しんでください。",
        "生まれた時刻だけで未来を知ることはできません。今の自分が心地よく過ごせる時間を大切にしましょう。"
      ]);
    }
  }
  if(person&&month===derived.month&&day===derived.day)write("luckyNote","🎂 お誕生日おめでとうございます！　今日が笑顔の多い一日になりますように。");
  else write("luckyNote","✨ 今日の幸運のヒント： "+pick(["お気に入りの色","温かい飲み物","懐かしい音楽","笑顔のあいさつ","季節の花"],dayNo,5,seed)+" を楽しんでみてください。");
  for(const b of document.querySelectorAll("[data-offset]"))b.setAttribute("aria-pressed",String(Number(b.dataset.offset)===offset));
  latest={date:keyText,title:subject[0],overview:overallParagraphs.join("\n\n")};
  if(active==="today")document.title=year+"年"+month+"月"+day+"日 · 今日の運勢";
}
function showTab(tab,writeUrl=true){
  if(!["today","saju","y2026","y2027"].includes(tab))tab="today";
  active=tab;
  for(const name of ["today","saju","y2026","y2027"]){
    hidden("panel-"+name,name!==tab);
    const b=$("tab-"+name);b.setAttribute("aria-selected",String(name===tab));b.tabIndex=name===tab?0:-1;
  }
  if(writeUrl&&history.replaceState)try{history.replaceState(null,"",location.pathname+location.search+(tab==="today"?"":"#"+tab));}catch(e){}
  if(writeUrl&&person&&window.matchMedia&&window.matchMedia("(max-width:640px)").matches){
    const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("panel-"+tab).scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
  }
  document.title=(tab==="today"&&latest?latest.date:"四柱推命・年間運勢")+" · 今日の運勢";
}
function autoRefresh(){
  const today=nowJapan();
  if(today!==lastDay){lastDay=today;offset=0;renderToday();}
}
function submit(e){
  e.preventDefault();
  const p={name:$("personName").value.trim().slice(0,20),year:Number($("birthYear").value),month:Number($("birthMonth").value),day:Number($("birthDay").value),
    calendar:$("calendarType").value,branch:$("birthBranch").value,leap:$("calendarType").value==="lunar"&&$("lunarLeap").checked};
  try{
    const calc=profileCalc(p);person=p;derived=calc;
    try{localStorage.setItem(key,JSON.stringify(p));write("profileStatus","この端末に保存しました。次回もそのままお使いいただけます。");}
    catch(e){write("profileStatus","運勢は更新されましたが、このブラウザでは保存できませんでした。");}
    drawProfile();offset=0;renderToday();$("profileEditor").open=false;
    if(window.matchMedia&&window.matchMedia("(max-width:640px)").matches)window.scrollTo({top:0,behavior:"smooth"});
  }catch(err){write("profileStatus",err.message||"入力内容をご確認ください。");}
}
async function share(){
  const url=location.href.split("#")[0]+(active==="today"?"":"#"+active);
  const desc=active==="today"&&latest?"🌸 今日の運勢（"+latest.date+"）\n"+latest.title+"\n\n"+latest.overview.split("\n\n")[0]:"🌸 今日の運勢 · "+(active==="saju"?"四柱推命":active==="y2026"?"2026年の運勢":"2027年の運勢");
  try{
    if(navigator.share){await navigator.share({title:"今日の運勢",text:desc,url});return;}
    await navigator.clipboard.writeText(desc+"\n"+url);alert("共有する文章とURLをコピーしました。");
  }catch(e){if(e.name!=="AbortError")alert("共有メニューを開けませんでした。URLコピーをご利用ください。");}
}
async function copyLink(){
  try{await navigator.clipboard.writeText(location.origin+location.pathname+(active==="today"?"":"#"+active));alert("URLをコピーしました。");}
  catch(e){prompt("このURLをコピーしてください",location.href);}
}
$("calendarType").addEventListener("change",()=>hidden("leapWrap",$("calendarType").value!=="lunar"));
$("profileForm").addEventListener("submit",submit);
for(const button of document.querySelectorAll("[data-tab]")){
  button.addEventListener("click",()=>showTab(button.dataset.tab));
  button.addEventListener("keydown",e=>{
    const names=["today","saju","y2026","y2027"],i=names.indexOf(button.dataset.tab);
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
    e.preventDefault();const n=e.key==="Home"?0:e.key==="End"?3:e.key==="ArrowRight"?(i+1)%4:(i+3)%4;
    showTab(names[n]);$("tab-"+names[n]).focus();
  });
}
for(const button of document.querySelectorAll("[data-offset]"))button.addEventListener("click",()=>{offset=Number(button.dataset.offset);renderToday();});
$("bigger").addEventListener("click",()=>{
  fontLarge=!fontLarge;document.documentElement.style.setProperty("--scale",fontLarge?"1.16":"1");
  $("bigger").textContent=fontLarge?"通常の文字サイズ":"文字を大きく";
  try{localStorage.setItem("fortune-ja-big-text",fontLarge?"1":"0");}catch(e){}
});
$("share").addEventListener("click",share);$("copyLink").addEventListener("click",copyLink);
window.addEventListener("hashchange",()=>showTab(location.hash.slice(1),false));
window.addEventListener("pageshow",autoRefresh);
window.addEventListener("focus",autoRefresh);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)autoRefresh();});
setInterval(autoRefresh,30000);
try{fontLarge=localStorage.getItem("fortune-ja-big-text")==="1";}catch(e){}
document.documentElement.style.setProperty("--scale",fontLarge?"1.16":"1");
if(fontLarge)$("bigger").textContent="通常の文字サイズ";
function updateScrollToTop(){
 const mobile=window.matchMedia?window.matchMedia("(max-width:640px)").matches:true;
 $("scrollToTop").hidden=!mobile||(window.scrollY||document.documentElement.scrollTop||0)<430;
}
$("scrollToTop").addEventListener("click",()=>{
 const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 window.scrollTo({top:0,behavior:reduce?"auto":"smooth"});
});
window.addEventListener("scroll",updateScrollToTop,{passive:true});
window.addEventListener("resize",updateScrollToTop);
window.addEventListener("pageshow",updateScrollToTop);
updateScrollToTop();
renderYears();initProfile();lastDay=nowJapan();renderToday();showTab(location.hash.slice(1),false);
})();