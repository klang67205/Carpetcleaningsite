const bookingUrl='https://book.housecallpro.com/book/Wichita-Carpet-Cleaning-Services/36104bbb2c7d409a8293445c570b5f8b?v2=true';
const messengerUrl='https://m.me/wichitacarpetcleaningservices';
const servedCities=['wichita','derby','andover','goddard','maize'];
const unsupportedCities=['haysville','newton','augusta','park city','valley center','bel aire','rose hill','clearwater','cheney','mulvane'];
const clean=text=>text.toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9$'\s-]/g,' ').replace(/\s+/g,' ').trim();
const titleCase=text=>text.replace(/\b\w/g,char=>char.toUpperCase());

function findCity(text){
  return [...servedCities,...unsupportedCities].find(city=>new RegExp(`\\b${city.replace(' ','\\s+')}\\b`,'i').test(text))||null;
}

function intentSet(text){
  const intents=[];
  const add=(name,pattern)=>{if(pattern.test(text))intents.push(name);};
  add('correction',/not what i asked|didn[' ]?t answer|you misunderstood|that makes no sense|wrong answer/);
  add('damage',/damage|damaged|ruined|bleach|discolor|torn|ripped|worse after|after.*cleaning/);
  add('refund',/refund|money back|chargeback|reimburse/);
  add('complaint',/complaint|unhappy|not happy|dissatisfied|poor job|bad job|job was bad|still dirty|missed.*spot/);
  add('cancel',/\bcancel|cancellation|\bcanel\b/);
  add('reschedule',/resched|resced|change.*(appointment|time|date)|move.*appointment|can(?:not|'t) make.*appointment/);
  add('confirmation',/didn[' ]?t get|no confirmation|not confirmed|confirm.*appointment/);
  add('same-day',/same.?day|\btoday\b|asap|urgent|right away/);
  add('booking',/\bbook|schedule|new appointment|availability|available|opening|see times/);
  add('price',/price|pricing|\bprce\b|cost|how much|amount|rate|\$?99|\$?149|extra room|additional room|rooms?.*(cost|price)/);
  add('pet',/\b(?:pet|animal|dog|cat)\b|odor|urine/);
  add('area',/service area|coverage area|do you serve|come to|travel(?: to)?|location|located|what cities|what city|where do you work|near me/);
  add('hours',/hours?|open|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday/);
  add('drying',/dry|drying|wet|walk on|use.*carpet/);
  add('furniture',/furniture|couch|loveseat|\bbed\b|sectional|\bmove\b/);
  add('preparation',/prepare|prep|vacuum|\bclear\b|before.*(come|arrive|visit|clean)/);
  add('other-services',/other services|upholstery|sofa|chair|tile|grout|hard.?floor/);
  add('commercial',/commercial|office|business|large space|unusual|quote/);
  add('stain',/stain|spot|spill|wine|coffee|paint|ink/);
  add('specialized',/mold|sewage|flood|biohazard|water damage/);
  add('safety',/allerg|chemical|sensitive|safe for|child|baby/);
  add('payment',/payment|\bpay\b|card|cash|invoice|receipt/);
  add('method',/how.*clean|process|equipment|steam|encapsulation|low.moisture/);
  add('guarantee',/guarantee|promise|definitely.*remove|will.*come out/);
  add('messages',/sent.*(message|text)|missed.*message|\btexted\b|housecall.*message|\breply\b|inbox/);
  add('human',/human|person|owner|someone|representative|talk to/);
  return [...new Set(intents)];
}

function roomEstimate(text){
  const match=text.match(/\b(\d{1,2})\s*(?:rooms?|bedrooms?)\b/);
  if(!match)return null;
  const rooms=Number(match[1]);
  if(rooms<1||rooms>30)return null;
  const extras=Math.max(0,rooms-5);
  return {rooms,standard:99+extras*15,pet:149+extras*15,extras};
}

export function createConversation(){
  const state={lastIntent:null,lastAnswer:null,turns:0};
  const remember=(intent,text,actions={})=>{state.lastIntent=intent;state.lastAnswer=text;return {text,...actions};};

  const respond=raw=>{
    const text=clean(raw.trim());
    state.turns+=1;
    if(!text)return {text:'What would you like help with?'};
    const intents=intentSet(text);
    const city=findCity(text);
    const estimate=roomEstimate(text);
    const repeated=intents.length===1&&intents[0]===state.lastIntent;
    let primary=intents.find(intent=>intent!=='correction')||null;

    if(intents.includes('correction')){
      primary=state.lastIntent;
      if(primary==='refund')return remember('refund','You’re right. Refund requests are reviewed case by case after the visit. Send the appointment date and what went wrong privately in Messenger so it can be reviewed.',{messenger:true});
      if(primary==='damage'||primary==='complaint')return remember(primary,'You’re right. The concern needs a real review. Send the appointment date, what happened, and any photos privately in Messenger.',{messenger:true});
      return remember('correction','You’re right—I missed your question. Please ask it once more in a few words and I’ll answer it directly.');
    }
    if(intents.includes('specialized'))return remember('specialized','That needs specialized assessment and should not be booked as standard carpet cleaning. Send the situation and photos privately in Messenger before anyone enters or cleans the area.',{messenger:true});
    if(intents.includes('damage'))return remember('damage','I’m sorry—that needs a real review. Send the appointment date, what changed, and clear photos privately in Messenger. If the area seems unsafe, stop using it until it is reviewed.',{messenger:true});
    if(intents.includes('refund')&&intents.includes('cancel'))return remember('refund','To cancel, use “Manage Appointment” in your Housecall Pro confirmation. Refund requests are reviewed case by case; send the appointment date and what happened privately in Messenger.',{messenger:true});
    if(intents.includes('refund'))return remember('refund',repeated?'Yes—refund requests are reviewed case by case. Send the appointment date and what went wrong privately in Messenger.':'Refunds aren’t automatic, but concerns are reviewed case by case after the visit. Send the appointment date and what went wrong privately in Messenger so it can be reviewed.',{messenger:true});
    if(intents.includes('complaint'))return remember('complaint','I’m sorry the visit wasn’t right. Send the appointment date, what was missed, and any helpful photos privately in Messenger so the concern can be reviewed.',{messenger:true});
    if(intents.includes('cancel'))return remember('cancel','Use “Manage Appointment” in your Housecall Pro confirmation to cancel. Please do it at least 24 hours ahead; a $25 late-cancellation fee may apply.');
    if(intents.includes('reschedule'))return remember('reschedule','Use “Manage Appointment” in your Housecall Pro confirmation to choose a new time. Please change it at least 24 hours ahead; a $25 late-change fee may apply.');
    if(intents.includes('confirmation'))return remember('confirmation','A booking is confirmed only after Housecall Pro sends the confirmation. If none arrived, use online booking to choose a future time again.',{booking:true});
    if(intents.includes('same-day'))return remember('same-day','We don’t offer same-day appointments. The booking page shows the next available future times.',{booking:true});

    if(city&&intents.includes('price')){
      const area=servedCities.includes(city)?`${titleCase(city)} is in our service area.`:`${titleCase(city)} isn’t in our listed service area.`;
      const offer=intents.includes('pet')?'Pet-treatment cleaning is $149 plus tax for up to five rooms, two hallways, and one standard staircase.':'Standard cleaning is $99 plus tax for up to five rooms, two hallways, and one standard staircase.';
      return remember('price',`${area} ${offer} Additional rooms are $15 each.`,servedCities.includes(city)?{booking:true}:{});
    }
    if(intents.includes('area')&&intents.includes('price'))return remember('price','Our standard cleaning is $99 plus tax; pet-treatment cleaning is $149. Both cover up to five rooms, two hallways, and one standard staircase, and additional rooms are $15 each. We serve Wichita, Derby, Andover, Goddard, and Maize.',{booking:true});
    if(intents.includes('pet')&&intents.includes('drying'))return remember('pet','Our pet-treatment cleaning is $149 plus tax and covers up to five rooms, two hallways, and one standard staircase. Low-moisture cleaning usually dries much faster than heavily saturated carpet, although airflow, humidity, and carpet type affect the exact time.',{booking:true});
    if((intents.includes('furniture')||intents.includes('preparation'))&&intents.includes('drying'))return remember('preparation','Please clear small items and move beds, large sectionals, and other heavy furniture before the visit. Low-moisture cleaning usually dries quickly, but the exact time depends on airflow, humidity, and carpet type.');
    if(intents.includes('hours')&&intents.includes('booking'))return remember('booking','Appointments are Monday through Friday, 7 AM to 5 PM. You can choose an available future time online.',{booking:true});
    if(intents.includes('other-services')&&intents.includes('price'))return remember('other-services','Upholstery, tile and grout, and hard-floor cleaning are available. Choose the service in online booking to see the current options and price.',{booking:true,label:'View service options'});

    if(estimate&&(intents.includes('price')||state.lastIntent==='price'||state.lastIntent==='pet')){
      const extra=estimate.extras?` That includes ${estimate.extras} additional room${estimate.extras===1?'':'s'} at $15 each.`:'';
      return remember('price',`For ${estimate.rooms} room${estimate.rooms===1?'':'s'}, standard cleaning is $${estimate.standard} plus tax, or $${estimate.pet} with pet treatment.${extra}`,{booking:true});
    }
    if(city&&(intents.includes('area')||intents.length===0)){
      if(servedCities.includes(city))return remember('area',`Yes, ${titleCase(city)} is in the service area. You can see available future times here.`,{booking:true});
      return remember('area',`${titleCase(city)} isn’t in the listed service area. Current service is Wichita, Derby, Andover, Goddard, and Maize.`);
    }
    if(intents.includes('price')&&intents.includes('pet'))return remember('pet','Absolutely. Our pet-treatment cleaning is $149 plus tax and covers up to five rooms, two hallways, and one standard staircase. If you have more than five rooms, each additional room is $15.',{booking:true});
    if(intents.includes('price'))return remember('price','Our standard cleaning is $99 plus tax and covers up to five rooms, two hallways, and one standard staircase. Pet-treatment cleaning is $149, and each additional room is $15.',{booking:true});
    if(intents.includes('pet'))return remember('pet','Absolutely. Our pet-treatment cleaning is $149 plus tax and covers up to five rooms, two hallways, and one standard staircase. If you have more than five rooms, each additional room is $15.',{booking:true});
    if(intents.includes('area'))return remember('area','The service area is Wichita, Derby, Andover, Goddard, and Maize. On-base military housing isn’t serviced. Which city are you asking about?');
    if(/military|on base/.test(text))return remember('area','On-base military housing isn’t serviced.');
    if(intents.includes('booking'))return remember('booking','You can choose the service and an available future time online. Standard cleaning is $99; pet-treatment cleaning is $149.',{booking:true});
    if(intents.includes('drying'))return remember('drying','Low-moisture cleaning usually dries much faster than heavily saturated carpet. Timing varies with airflow, humidity, carpet type, and soil conditions.');
    if(intents.includes('furniture')||intents.includes('preparation'))return remember('preparation','Please clear small items before the visit. Smaller pieces can usually be worked around or moved; beds, large sectionals, and other heavy furniture should be moved beforehand.');
    if(intents.includes('hours'))return remember('hours','Appointments are Monday through Friday, 7 AM to 5 PM. The business is closed Saturday and Sunday.');
    if(intents.includes('other-services'))return remember('other-services','Yes—upholstery, tile and grout, and hard-floor cleaning are available. Choose the service in online booking to see its current options.',{booking:true,label:'View service options'});
    if(intents.includes('commercial'))return remember('commercial','Commercial and unusually large spaces need a custom review before a price can be promised. Send the type of space, approximate size, and photos privately in Messenger.',{messenger:true});
    if(intents.includes('safety'))return remember('safety','Please send the specific allergy, sensitivity, child, or pet concern privately before booking so the products and process can be checked for your situation.',{messenger:true});
    if(intents.includes('stain')||intents.includes('guarantee'))return remember('stain','Many spots improve, but removal depends on the carpet fiber, the substance, its age, and earlier treatments. Complete removal can’t be promised before inspection.');
    if(intents.includes('method'))return remember('method','The service uses professional low-moisture encapsulation cleaning with pretreatment and counter-rotating brush agitation. It avoids heavily saturating the carpet.');
    if(intents.includes('payment'))return remember('payment','Housecall Pro shows the payment details for the specific visit and provides the invoice or receipt.');
    if(intents.includes('messages'))return remember('messages','For an existing job, reply through the Housecall Pro message or use “Manage Appointment” in the confirmation so the update stays with the correct appointment.');
    if(intents.includes('human'))return remember('human','Send a private Messenger message with the appointment date and a short summary. That keeps the conversation together for review.',{messenger:true});
    if(/^(hi|hello|hey|good morning|good afternoon|good evening)[ '!.-]*$/.test(text))return remember('greeting','Hi! What can I help with—pricing, booking, an existing appointment, or a concern?');
    if(/thank|thanks|appreciate/.test(text))return remember('thanks','You’re welcome.');
    if(/^(yes|yeah|yep|correct|right)$/.test(text)&&state.lastIntent)return remember(state.lastIntent,'Got it. Use the button above when you’re ready, or tell me what else you need.');
    if(/^(no|nope|not really)$/.test(text))return remember('clarify','Okay. Tell me the result you need in one sentence and I’ll point you to the right place.');
    return remember('unknown','Tell me what you need in one sentence. I can answer pricing and service questions, help with a new booking, explain how to change an appointment, or route a service concern.');
  };
  return {respond,state};
}

function initializePage(){
  const year=document.getElementById('year');
  if(year)year.textContent=new Date().getFullYear();
  document.querySelectorAll('details').forEach(item=>item.addEventListener('toggle',()=>{if(item.open)document.querySelectorAll('details[open]').forEach(other=>{if(other!==item)other.open=false;});}));
  const concierge=document.querySelector('.concierge');
  if(!concierge)return;
  const launch=concierge.querySelector('.concierge-launch');
  const panel=concierge.querySelector('.concierge-panel');
  const close=concierge.querySelector('.concierge-close');
  const messages=concierge.querySelector('.concierge-messages');
  const prompts=concierge.querySelector('.concierge-prompts');
  const form=concierge.querySelector('.concierge-form');
  const input=concierge.querySelector('input');
  const conversation=createConversation();
  const add=(text,who='guide')=>{const el=document.createElement('p');el.className=`concierge-message ${who}`;el.textContent=text;messages.append(el);messages.scrollTop=messages.scrollHeight;return el;};
  const addAction=(url,label)=>{const a=document.createElement('a');a.className='concierge-book';a.href=url;a.textContent=label;messages.append(a);messages.scrollTop=messages.scrollHeight;};
  const reply=result=>{const typing=add('•••','typing');window.setTimeout(()=>{typing.remove();add(result.text);if(result.booking)addAction(bookingUrl,result.label||'See times & book');if(result.messenger)addAction(messengerUrl,'Continue privately in Messenger');},180);};
  const ask=q=>{add(q,'visitor');reply(conversation.respond(q));input.value='';input.focus();};
  const open=()=>{panel.hidden=false;launch.setAttribute('aria-expanded','true');if(!messages.children.length)add('Hi! What can I help with today?');input.focus();};
  const shut=()=>{panel.hidden=true;launch.setAttribute('aria-expanded','false');launch.focus();};
  launch.addEventListener('click',()=>panel.hidden?open():shut());
  close.addEventListener('click',shut);
  prompts.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{ask(button.dataset.prompt);prompts.hidden=true;}));
  form.addEventListener('submit',event=>{event.preventDefault();const q=input.value.trim();if(q){ask(q);prompts.hidden=true;}});
}

if(typeof document!=='undefined')initializePage();
