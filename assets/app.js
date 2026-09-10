const bookingUrl='https://book.housecallpro.com/book/Wichita-Carpet-Cleaning-Services/36104bbb2c7d409a8293445c570b5f8b?v2=true';
document.getElementById('year').textContent=new Date().getFullYear();
document.querySelectorAll('details').forEach(item=>item.addEventListener('toggle',()=>{if(item.open)document.querySelectorAll('details[open]').forEach(other=>{if(other!==item)other.open=false;});}));

const concierge=document.querySelector('.concierge');
if(concierge){
  const launch=concierge.querySelector('.concierge-launch');
  const panel=concierge.querySelector('.concierge-panel');
  const close=concierge.querySelector('.concierge-close');
  const messages=concierge.querySelector('.concierge-messages');
  const prompts=concierge.querySelector('.concierge-prompts');
  const form=concierge.querySelector('.concierge-form');
  const input=concierge.querySelector('input');
  const state={topic:null,step:null};
  const cityPattern=/\b(wichita|derby|andover|goddard|maize)\b/i;

  const add=(text,who='guide')=>{
    const el=document.createElement('p');
    el.className=`concierge-message ${who}`;
    el.textContent=text;
    messages.append(el);
    messages.scrollTop=messages.scrollHeight;
    return el;
  };
  const addBooking=(label='See times & book')=>{
    const a=document.createElement('a');
    a.className='concierge-book';
    a.href=bookingUrl;
    a.textContent=label;
    messages.append(a);
    messages.scrollTop=messages.scrollHeight;
  };
  const addMessenger=()=>{
    const a=document.createElement('a');
    a.className='concierge-book';
    a.href='https://m.me/wichitacarpetcleaningservices';
    a.textContent='Continue privately in Messenger';
    messages.append(a);
    messages.scrollTop=messages.scrollHeight;
  };
  const reply=(text,{booking=false,messenger=false,label}={})=>{
    const typing=add('•••','typing');
    window.setTimeout(()=>{typing.remove();add(text);if(booking)addBooking(label);if(messenger)addMessenger();},300);
  };
  const titleCaseCity=city=>city[0].toUpperCase()+city.slice(1).toLowerCase();

  const handle=raw=>{
    const q=raw.trim();
    const lower=q.toLowerCase();
    const city=q.match(cityPattern)?.[1];
    const clearNewIntent=/\bcancel\b|resched|change.*appointment|move.*appointment|\bbook\b|schedule|same.?day|\bprice\b|\bcost\b|pet treatment|service area|do you serve|how long.*dry|move.*furniture/i;

    // Customers can change subjects at any point without an old question
    // swallowing the new request as a name, date, city, or service answer.
    if(state.topic&&clearNewIntent.test(lower)){state.topic=null;state.step=null;}

    if(state.topic==='complaint'&&state.step==='name'){
      state.step='date';
      return reply(`Thanks, ${q}. What day was the cleaning?`);
    }
    if(state.topic==='complaint'&&state.step==='date'){
      state.step='details';
      return reply('Got it. What happened? A sentence or two is enough. If you have photos, keep them handy.');
    }
    if(state.topic==='complaint'&&state.step==='details'){
      state.topic=null;state.step=null;
      return reply('Thank you—I’m sorry you’re dealing with this. Please send that summary and any photos in Messenger so the concern reaches the business for review.',{messenger:true});
    }
    if(state.topic==='area'){
      if(city){state.topic=null;return reply(`Yes, we clean in ${titleCaseCity(city)}. Here are the available future times.`,{booking:true});}
      if(/military|on.?base/.test(lower)){state.topic=null;return reply('We don’t service on-base military housing.');}
      return reply('What city are you in?');
    }
    if(state.topic==='booking'){
      if(/pet|urine|odor/.test(lower)){state.topic='area';return reply('Great—the pet-treatment cleaning is $149 plus tax for up to 5 rooms, 2 hallways and 1 staircase. What city are you in?');}
      if(/standard|regular|99|no pet/.test(lower)){state.topic='area';return reply('Great—the standard cleaning is $99 plus tax for up to 5 rooms, 2 hallways and 1 staircase. What city are you in?');}
    }

    if(/^(hi|hello|hey|good morning|good afternoon|good evening)[!. ]*$/.test(lower))return reply('Hi! What can I help you with today?');
    if(/damage|damaged|refund|chargeback|unhappy|complaint|not happy|ruined/.test(lower)){
      state.topic='complaint';state.step='name';
      return reply('I’m sorry this happened. Let’s get the right details together. What name is the appointment under?');
    }
    if(/cancel/.test(lower))return reply('You can cancel from the “Manage Appointment” link in your Housecall Pro confirmation. Please do it at least 24 hours ahead; a $25 fee may apply after that.');
    if(/resched|change.*appointment|change.*time|move.*appointment/.test(lower))return reply('You can pick a new time from the “Manage Appointment” link in your Housecall Pro confirmation. Please change it at least 24 hours ahead; a $25 fee may apply after that.');
    if(/didn.t get|no confirmation|not confirmed|confirm.*appointment/.test(lower))return reply('Your appointment is set once Housecall Pro sends the confirmation. If you didn’t get one, choose a time again here.',{booking:true});
    if(/message|sent.*(message|text)|reply/.test(lower))return reply('For a new cleaning, booking online gives you an immediate confirmation. For an existing appointment, use the Manage Appointment link in your Housecall Pro notification so the update stays with the correct job.',{booking:true});
    if(/today|same day|asap|urgent/.test(lower))return reply('We don’t book same-day visits, but you can see the next available future times here.',{booking:true});
    if(/pet|odor|urine|animal/.test(lower)){state.topic='area';return reply('Yes, we handle pet stains and odor. It’s $149 plus tax for up to 5 rooms, 2 hallways and 1 staircase. We can often improve the problem, but no one can promise every spot or odor will disappear. What city are you in?');}
    if(/price|cost|\$?99|five room|5 room|include|extra room/.test(lower))return reply('The standard cleaning is $99 plus tax for up to 5 rooms, 2 hallways and 1 staircase. Pet treatment is $149, and extra rooms are $15 each.');
    if(/dry|wet|walk|use.*carpet/.test(lower))return reply('It usually dries much faster than heavily soaked carpet. The exact time depends on airflow, humidity and the type of carpet.');
    if(/furniture|couch|loveseat|bed|sectional|move/.test(lower))return reply('We can usually work around or move smaller pieces. Please move beds, large sectionals and other heavy furniture before the visit.');
    if(/prepare|prep|vacuum|before/.test(lower))return reply('Please clear small items and move beds, large sectionals and other heavy furniture before arrival.');
    if(/base|military/.test(lower))return reply('We don’t service on-base military housing.');
    if(city)return reply(`Yes, we clean in ${titleCaseCity(city)}. Here are the available future times.`,{booking:true});
    if(/area|serve|location|city|haysville|newton|augusta|park city|valley center/.test(lower)){state.topic='area';return reply('We cover Wichita, Derby, Andover, Goddard and Maize. What city are you in?');}
    if(/hour|open|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday/.test(lower))return reply('Appointments are Monday through Friday, 7 AM to 5 PM. We’re closed Saturday and Sunday.');
    if(/upholstery|sofa|chair|tile|grout|hard.?floor/.test(lower))return reply('That service is available. Open online booking to choose the service and see its current options.',{booking:true});
    if(/commercial|office|business|large|unusual|quote/.test(lower))return reply('Please describe the space and approximate size. Commercial and unusual layouts need a custom review before a price is promised.');
    if(/stain|spot|spill|wine|coffee/.test(lower))return reply('Cleaning can improve many spots, but the result depends on the carpet fiber, what was spilled, how old it is and any earlier treatments. Complete removal can’t be promised before inspection.');
    if(/mold|sewage|flood|biohazard|water damage/.test(lower))return reply('That needs specialized assessment and should not be booked as a standard carpet-cleaning visit. Please keep the details in Messenger so the situation can be reviewed safely.');
    if(/allerg|chemical|sensitive/.test(lower))return reply('Please describe the sensitivity or safety concern before booking so it can be reviewed against the products and process.');
    if(/payment|card|cash|invoice|receipt/.test(lower))return reply('Your Housecall Pro appointment and invoice show the payment details and receipt for that specific visit.');
    if(/book|schedule|appointment|available|opening|time/.test(lower)){state.topic='booking';return reply('Absolutely. Is this a standard cleaning or do you need pet treatment?');}
    return reply('Of course—tell me a little more about what you need, and I’ll point you to the right next step.');
  };

  const ask=q=>{add(q,'visitor');handle(q);input.value='';input.focus();};
  const open=()=>{panel.hidden=false;launch.setAttribute('aria-expanded','true');if(!messages.children.length)add('Hi! What can I help you with today?');input.focus();};
  const shut=()=>{panel.hidden=true;launch.setAttribute('aria-expanded','false');launch.focus();};
  launch.addEventListener('click',()=>panel.hidden?open():shut());
  close.addEventListener('click',shut);
  prompts.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{state.topic=null;state.step=null;ask(button.dataset.prompt);prompts.hidden=true;}));
  form.addEventListener('submit',event=>{event.preventDefault();const q=input.value.trim();if(q){ask(q);prompts.hidden=true;}});
}
