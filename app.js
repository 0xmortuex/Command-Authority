
const secs=[...document.querySelectorAll('main section')],links=[...document.querySelectorAll('nav a')];
function show(){const id=(location.hash||'#callsigns').slice(1);const ok=secs.some(s=>s.id==='view-'+id)?id:'callsigns';
secs.forEach(s=>s.classList.toggle('on',s.id==='view-'+ok));links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+ok));window.scrollTo(0,0)}
window.addEventListener('hashchange',show);show();
const q=document.getElementById('q'),chips=[...document.querySelectorAll('.chip')],cards=[...document.querySelectorAll('.ucard')],cnt=document.getElementById('count');
let br=new Set();
function filter(){const t=q.value.trim().toLowerCase();let rows=0,cs=0;
cards.forEach(c=>{const okBr=!br.size||br.has(c.dataset.br);const head=(c.querySelector('h2').textContent+' '+c.querySelector('.u').textContent).toLowerCase();
const headHit=t&&head.includes(t);let vis=0;
c.querySelectorAll('tr').forEach(r=>{const hit=!t||headHit||r.textContent.toLowerCase().includes(t);r.classList.toggle('hide',!hit);if(hit)vis++});
const show=okBr&&vis>0;c.classList.toggle('hide',!show);if(show){cs++;rows+=vis}});
cnt.textContent=cs+' units · '+rows+' entries'}
q.addEventListener('input',filter);
chips.forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.br;br.has(k)?br.delete(k):br.add(k);b.classList.toggle('on');filter()}));
filter();
