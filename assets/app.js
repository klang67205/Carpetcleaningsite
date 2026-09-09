const bookingUrl='https://book.housecallpro.com/book/Wichita-Carpet-Cleaning-Services/36104bbb2c7d409a8293445c570b5f8b?v2=true';
document.getElementById('year').textContent=new Date().getFullYear();
document.querySelectorAll('details').forEach(item=>item.addEventListener('toggle',()=>{if(item.open)document.querySelectorAll('details[open]').forEach(other=>{if(other!==item)other.open=false;});}));
const concierge=document.querySelector('.concierge');
if(concierge){const launch=concierge.querySelector('.concierge-launch'),panel=concierge.querySelector('.concierge-panel'),close=concierge.querySelector('.concierge-close'),messages=concierge.querySelector('.concierge-messages'),form=concierge.querySelector('.concierge-form'),input=concierge.querySelector('input');
const scenarios=[
[/cancel/,`To cancel an existing appointment, use the manage-appointment link in your original Housecall Pro confirmation. That is the quickest path because it is attached to your booked job.`],
[/resched|change.*time|move.*appointment/,`To reschedule an existing appointment, use the manage-appointment link in your Housecall Pro confirmation. It keeps the change tied to the correct job and calendar slot.`],
[/late|running late|arrival|when.*arrive/,`Your scheduled arrival details are in the Housecall Pro confirmation. The booking guide can help with a new booking, but it cannot see or alter an existing job.`],
[/lock|access|gate|code|not.*home/,`For arrival access, use the job communication in your Housecall Pro confirmation so the note stays with the appointment.`],
[/pet|odor|urine|animal/,`Pet-treatment cleaning is $149 plus tax. It includes the same area as the standard clean—up to 5 rooms, 2 hallways and 1 standard staircase—with the pet-treatment process included.`],
[/price|cost|99|five room|5 room|include|extra room/,`Standard cleaning is $99 plus tax for up to 5 rooms, 2 hallways and 1 standard staircase. Pet-treatment cleaning is $149 plus tax. Additional rooms are $15 each.`],
[/tax/,`The listed service prices are plus applicable tax.`],
[/dry|wet|use/,`Low-moisture cleaning is designed for faster drying. Actual drying time varies with airflow, humidity, carpet construction and soil conditions.`],
[/furniture|couch|bed|move/,`Small items such as couches and loveseats can be moved. Please move beds, large sectionals and other heavy furniture before arrival.`],
[/prepare|prep|vacuum|before/,`Please clear small items and move beds, large sectionals and other heavy furniture before arrival. The booking confirmation keeps the appointment details together.`],
[/area|serve|wichita|derby|andover|goddard|maize/,`We serve Wichita, Derby, Andover, Goddard and Maize.`],
[/base|military/,`On-base military housing is not serviced.`],
[/hour|open|weekend|monday|friday/,`Business hours are Monday through Friday, 7 AM to 5 PM. Online booking shows the current appointment options.`],
[/commercial|large|unusual|quote/,`For commercial, unusually large, or special requests, review the booking options first. Exact scope can be discussed before service.`],
[/upholstery|sofa|chair|tile|grout|hard floor/,`Upholstery, tile and grout, and hard-floor cleaning are listed in the booking experience. Choose the service there to view the available options.`],
[/stain|spot|spill|wine|coffee/,`Cleaning can improve many spots, but results vary with fiber, dye stability, the material spilled, age of the spot, and prior treatments. Avoid promising complete removal before inspection.`],
[/mold|sewage|flood|water damage/,`Mold, sewage, flooding, and water-damage situations need specialized assessment. This booking guide does not treat those as standard carpet-cleaning appointments.`],
[/payment|card|cash|pay/,`Your Housecall Pro appointment and invoice show the payment details for your specific job.`],
[/invoice|receipt/,`Your Housecall Pro appointment is the source for the invoice and receipt tied to that visit.`],
[/complaint|unhappy|problem|damage/,`I’m sorry the visit did not meet expectations. Use the job communication in your Housecall Pro confirmation so the concern is connected to the correct appointment.`],
[/weather|rain|snow/,`Weather can affect travel and drying conditions. Your Housecall Pro job communication is the place for appointment-specific updates.`],
[/allerg|chemical|sensitive/,`For chemical sensitivities or special safety concerns, review the service details before booking and discuss the specific concern before service.`],
[/book|time|schedule|appointment|available/,`The booking page shows the current available times and the correct service options.`]
];
const answer=q=>{const found=scenarios.find(([pattern])=>pattern.test(q.toLowerCase()));return found?found[1]:`I can help with pricing, pet treatment, drying time, furniture, service area, booking, rescheduling, cancellations, preparation, invoices, access, and common service questions.`;};
const needsBooking=text=>/booking page|available times|booking experience|review the booking options/.test(text);
const add=(text,who='guide')=>{const el=document.createElement('p');el.className=`concierge-message ${who}`;el.textContent=text;messages.append(el);if(who==='guide'&&needsBooking(text)){const a=document.createElement('a');a.className='concierge-book';a.href=bookingUrl;a.textContent='See times & book';messages.append(a);}messages.scrollTop=messages.scrollHeight;};
const open=()=>{panel.hidden=false;launch.setAttribute('aria-expanded','true');if(!messages.children.length)add('Hi—ask me about pricing, pet treatment, drying, booking, cancellations, rescheduling, preparation, or your service area.');input.focus();};const shut=()=>{panel.hidden=true;launch.setAttribute('aria-expanded','false');launch.focus();};launch.addEventListener('click',()=>panel.hidden?open():shut());close.addEventListener('click',shut);concierge.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{const q=button.dataset.prompt;add(q,'visitor');add(answer(q));}));form.addEventListener('submit',event=>{event.preventDefault();const q=input.value.trim();if(!q)return;add(q,'visitor');add(answer(q));input.value='';});}
