// Interactive vote demo
function vote(yes){
  var r = document.getElementById('voteResult');
  var streak = document.getElementById('streak');
  var last = streak.querySelector('.stamp.todo');
  if(yes){
    r.textContent = "✓ Maioria votou sim — entrou na sequência da Manu!";
    r.style.color = "var(--green-ink)";
    if(last){ last.className = "stamp ok"; last.textContent = "✓"; }
  } else {
    r.textContent = "✕ Maioria votou não — essa evidência não contou.";
    r.style.color = "var(--coral)";
    if(last){ last.className = "stamp no"; last.textContent = "✕"; }
  }
  r.classList.add('show');
}

// Scroll reveal
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
} else {
  document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); });
}
