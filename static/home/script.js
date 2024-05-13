// Code goes here


function remove_ele(ev){
  if(ev.className==="rmvbtn"){
    ev.parentNode.remove()
  }
}


function showSelectedPhotos() {

  let reader = new FileReader();
  let img = document.createElement('img');


  let input= document.getElementById("imagenotes");
  let notes_ele = document.getElementById("notebox");
  let notes=notes_ele.value;
  if(!input.files)
    return;
  
  for(i=0;i<input.files.length;i++)
  {
    
    var reader3 = new FileReader();    
    reader3.onload = function(e) {
      $('#all_notes_container').append('<div class="home-note" > \
        <div class="home-container15"> \
        <img \
        alt="image" \
        src="'+ e.target.result +'" \
        class="home-image"  \
        <span class="home-text094"> \
        '+notes+' \
        </span> \
        </div> \
        <img \
        alt="pastedImage" \
        src="/static/home/public/external/pastedimage-ufj.svg" \
        class="rmvbtn" onclick="remove_ele(this)" \
        /> \
        </div>');

    };
    reader3.readAsDataURL(input.files[i]);
  } 
  
  input.value=null;
  notes_ele.value=null;
  
}




let fillData = () => {



  let txtarea=document.getElementById('suggestionsdiv');
  let suggestions_ele= document.getElementById("inputsuggestions");
  let suggestions = suggestions_ele.value;
  console.log(txtarea.innerHTML);
  txtarea.innerHTML+= '<div class="home-table-row6"> \
  <span class="home-text089">'+ new Date().toISOString().split('T')[0] +'</span> \
  <span class="home-text090"> \
  '+ suggestions +' \
  </span> \
  <input \
  type="image" \
  alt="pastedImage" \
  src="/static/home/public/external/pastedimage-ufj.svg" \
  class="rmvbtn"  onclick="remove_ele(this)" \
  /></div>';  
  suggestions_ele.value=null;

}



let hide_suggestions =() => {

let suggestion_fields=document.getElementsByClassName('home-flexdiv')[0];
suggestion_fields.style.display="none";
let notes_field= document.getElementsByClassName('home-note1')[0];
notes_field.style.display="none";

let update_field= document.getElementById('update_button');
update_field.style.display="none";
}