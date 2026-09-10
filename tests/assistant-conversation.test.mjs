import assert from 'node:assert/strict';
import {createConversation} from '../assets/app.js';

const one=input=>createConversation().respond(input);
const includes=(input,expected)=>assert.match(one(input).text,expected,input);

includes('Do you offer refunds?',/reviewed case by case/i);
includes('You damaged my carpet',/real review/i);
includes('I am unhappy because spots are still dirty',/appointment date/i);
includes('cancel my appointment',/Manage Appointment/i);
includes('I need to change my time',/Manage Appointment/i);
includes('can you come today?',/don.t offer same-day/i);
includes('What does $99 include?',/five rooms, two hallways/i);
includes('I have 7 rooms how much?',/\$129.*\$179/i);
includes('How much is pet treatment?',/\$149/i);
includes('Do you serve Derby?',/in the service area/i);
includes('Do you serve Newton?',/isn.t in the listed service area/i);
includes('where do you work?',/Wichita, Derby, Andover, Goddard, and Maize/i);
includes('How long until it is dry?',/airflow, humidity/i);
includes('do I have to move my sectional?',/large sectionals/i);
includes('what should I do before you arrive?',/clear small items/i);
includes('are you open Saturday?',/closed Saturday and Sunday/i);
includes('do you clean tile and grout?',/tile and grout/i);
includes('How much to clean my sofa and loveseat?',/\$149/i);
includes('What does a sofa cost?',/\$89/i);
includes('How much is a recliner?',/\$39/i);
includes('Price for a large sectional?',/\$169/i);
includes('How much is bathroom tile cleaning?',/\$99/i);
includes('What does kitchen grout cleaning cost?',/\$129/i);
includes('Price for 300 square feet of hard floor?',/\$139/i);
includes('I need a quote for my office',/custom review/i);
includes('can you remove a wine stain?',/can.t be promised/i);
includes('do you handle sewage?',/specialized assessment/i);
includes('is it safe for allergies?',/specific allergy/i);
includes('what cleaning process do you use?',/encapsulation/i);
includes('where is my receipt?',/invoice or receipt/i);
includes('I sent a message in Housecall Pro',/correct appointment/i);
includes('I need a human',/private Messenger/i);
includes('hello',/pricing, booking/i);

const correction=createConversation();
assert.match(correction.respond('do you offer refunds').text,/case by case/i);
const second=correction.respond("that's not what i asked");
assert.match(second.text,/refund requests/i);
assert.doesNotMatch(second.text,/Thank you, that/i);
assert.doesNotMatch(second.text,/What date was the cleaning/i);

const context=createConversation();
context.respond('how much does it cost?');
assert.match(context.respond('what about 8 rooms?').text,/\$144.*\$194/i);

console.log('Assistant conversation checks passed (28 scenarios).');

const matrix=[
  [/\$99/,['price please','what is the price','how much does carpet cleaning cost','is it really $99','pricing for five rooms','cost for standard cleaning','tell me your prices','standard package amount','what does $99 cover','how much for 2 rooms']],
  [/\$149/,['pet package','dog urine cleaning','cat odor help','animal stains','how much is pet service','pet-treatment details','need odor treatment','my dog had accidents','cat pee in carpet','price with pet treatment']],
  [/Manage Appointment/,['please cancel','cancellation help','cancel my booking','need to cancel','how can I cancel','I cannot make my appointment','reschedule me','move my appointment','change appointment date','change my cleaning time']],
  [/don.t offer same-day/i,['can you clean today','same day please','I need this asap','can someone come right away','urgent appointment','anything open today','today availability','book me for today']],
  [/future time|future times/,['book a cleaning','schedule service','new appointment','show availability','any openings','I want to book','see times','can I schedule online']],
  [/in the service area/,['service in Wichita','do you serve derby','come to Andover','travel to Goddard','is Maize covered']],
  [/isn.t in the listed service area/,['do you serve Newton','come to Haysville','service in Augusta','are you in Park City','travel to Valley Center','do you cover Bel Aire','service Rose Hill','come to Clearwater','service Cheney','do you clean in Mulvane']],
  [/Wichita, Derby, Andover, Goddard, and Maize/,['where do you work','what cities do you serve','service area','where are you located','what is your coverage area','do you travel','locations please']],
  [/closed Saturday and Sunday/,['are you open weekends','Saturday hours','Sunday appointments','what are your hours','open on Monday','weekday hours','when are you open']],
  [/airflow, humidity/,['drying time','how fast does it dry','when can I walk on it','will carpet be wet','how long until dry','can we use carpet after','does low moisture dry fast']],
  [/heavy furniture/,['move furniture','what about my couch','do I move beds','large sectional','prepare furniture','move a loveseat','what should I clear','prep before you arrive']],
  [/future weekday time online/,['clean my sofa','do you do chairs','upholstery service','tile cleaning','grout cleaning','hard floor cleaning','other services']],
  [/custom review/,['commercial carpet','office cleaning quote','business carpet service','very large space','unusual floor plan']],
  [/can.t be promised/,['remove coffee stain','wine spill','old spot','will this stain come out','guarantee removal','promise it will be clean','ink in carpet']],
  [/specialized assessment/,['mold in carpet','sewage cleanup','flooded room','biohazard cleaning','water damage']],
  [/specific allergy/,['chemical sensitivity','safe for allergies','baby safety','child around products','sensitive to cleaners']],
  [/invoice or receipt/,['need my receipt','where is invoice','how do I pay','payment details','do you take card']],
  [/encapsulation/,['how do you clean','what equipment','is this steam cleaning','explain the process','low moisture method','what is encapsulation']],
  [/real review|reviewed case by case|visit wasn.t right/,['you damaged it','carpet looks ruined','I want a refund','money back please','I am unhappy','bad job','still dirty','missed several spots','I have a complaint']],
  [/correct appointment/,['sent a Housecall message','I texted you','where do I reply','Housecall inbox','you missed my message']],
  [/private Messenger/,['I need a human','talk to the owner','can a person help','need someone','representative please']]
];

let matrixCount=0;
for(const [expected,inputs] of matrix){for(const input of inputs){assert.match(one(input).text,expected,input);matrixCount+=1;}}

const journeys=[
  ['refund correction',['Do you offer refunds?',"that's not what i asked"],[/case by case/i,/Refund requests/i]],
  ['price follow-up',['How much is standard cleaning?','what about 8 rooms?'],[/\$99/i,/\$144.*\$194/i]],
  ['pet then rooms',['Tell me about pet treatment','I have 7 rooms'],[/\$149/i,/\$129.*\$179/i]],
  ['area then booking',['Do you serve Derby?','I want to book'],[/service area/i,/future time/i]],
  ['complaint then scheduling',['The job was bad','I need to change my appointment'],[/review/i,/Manage Appointment/i]],
  ['booking then cancellation',['Book a cleaning','actually cancel my existing one'],[/future time/i,/Manage Appointment/i]],
  ['unknown then recovery',['asdf something','what does $99 include'],[/Tell me what you need/i,/five rooms/i]],
  ['greeting then pet',['hello','my dog had an accident'],[/What can I help/i,/\$149/i]],
  ['repeated refund',['refund please','refund please'],[/case by case/i,/Yes—refund requests/i]],
  ['thanks',['what does it cost','thanks'],[/\$99/i,/welcome/i]]
];
for(const [,inputs,expected] of journeys){const chat=createConversation();inputs.forEach((input,index)=>assert.match(chat.respond(input).text,expected[index],input));}

const compound=[
  ['Do you serve Derby and what does it cost?',/Derby is in our service area.*\$99/i],
  ['Do you serve Newton and how much is it?',/Newton isn.t in our listed service area.*\$99/i],
  ['What is the price and where do you work?',/\$99.*Wichita, Derby, Andover, Goddard, and Maize/i],
  ['How much is pet treatment and how long to dry?',/\$149.*dries much faster/i],
  ['What furniture do I move and when will it dry?',/heavy furniture.*dries quickly/i],
  ['What hours can I book?',/Monday through Friday.*future time/i],
  ['How much is tile cleaning?',/\$99 for a bathroom.*\$129 for a kitchen/i],
  ['I need to cancel and get a refund',/Manage Appointment.*case by case/i],
  ['Can you come today and what time?',/don.t offer same-day.*future times/i],
  ['prce for pet package',/\$149/i],
  ['i need to rescedule',/Manage Appointment/i],
  ['please canel it',/Manage Appointment/i]
];
compound.forEach(([input,expected])=>assert.match(one(input).text,expected,input));

console.log(`Stress matrix passed (${matrixCount} paraphrases + ${journeys.length} multi-turn journeys + ${compound.length} compound/typo cases).`);
