()=>{const w=n=>Array(n).fill('word').join(' ');
document.querySelectorAll('#app [data-fp]').forEach(e=>{if(e.disabled)return;
 if(e.tagName==='TEXTAREA'){e.value=w(170);e.dispatchEvent(new Event('input',{bubbles:true}))}
 else if(e.tagName==='SELECT'){if(e.options.length>1){e.selectedIndex=1;e.dispatchEvent(new Event('change',{bubbles:true}))}}
 else if(e.type==='checkbox'){if(!e.checked){e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}}
 else if(e.type==='date'){e.value='2027-03-01';e.dispatchEvent(new Event('input',{bubbles:true}))}
 else{e.value=e.type==='number'?'5':(e.closest('td')?'x':'https://example.com/a');e.dispatchEvent(new Event('input',{bubbles:true}))}});
document.querySelectorAll('#app [data-mp]').forEach(e=>{if(!e.checked){e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}})}