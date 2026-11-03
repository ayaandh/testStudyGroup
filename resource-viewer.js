const params=new URLSearchParams(location.search);const file=params.get("file");const title=document.querySelector("#resource-title");const status=document.querySelector("#resource-status");const output=document.querySelector("#resource-content");const download=document.querySelector("#resource-download");
const safePath=(value)=>value&&value.startsWith("/content/")&&!value.includes("..")&&/\.pdf$/i.test(value);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
if(!safePath(file)){title.textContent="Resource unavailable";status.textContent="Choose a PDF from the Academy library.";}else{
 title.textContent=file.split("/").pop().replace(/[-_]/g," ").replace(/\.pdf$/i,"");download.href=file;download.hidden=false;
 try{
  status.textContent="Reading PDF and preparing accessible text…";
  const pdfjs=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const pdf=await pdfjs.getDocument(file).promise;const sections=[];
  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
   const page=await pdf.getPage(pageNo);const content=await page.getTextContent();let lines=[];let current="";let lastY=null;
   for(const item of content.items){if(!item.str)continue;const y=Math.round(item.transform?.[5]||0);if(lastY!==null&&Math.abs(y-lastY)>3){if(current.trim())lines.push(current.trim());current="";}current+=item.str+(item.hasEOL?" ":" ");lastY=y;}
   if(current.trim())lines.push(current.trim());sections.push(`<section class="pdf-page"><h2>Page ${pageNo}</h2>${lines.map(line=>`<p>${esc(line)}</p>`).join("")||"<p class=muted>No selectable text on this page. Download the original to view scanned content.</p>"}</section>`);
  }
  output.innerHTML=sections.join("");status.textContent=`${pdf.numPages} pages · Text extracted in your browser · Original PDF remains available to download.`;
 }catch(err){console.error(err);status.textContent="We couldn't parse this PDF in the browser. You can still download the original.";}
}
