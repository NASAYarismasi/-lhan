import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
for(const kind of ['hava','su']){
  const result=await build({root,configFile:false,build:{write:false,rollupOptions:{input:path.join(root,kind+'-kaynak.html'),output:{codeSplitting:false}}}});
  const chunk=result.output.find(file=>file.type==='chunk'&&file.isEntry);
  if(!chunk)throw new Error('Missing entry: '+kind);
  let html=await readFile(path.join(root,kind+'-kaynak.html'),'utf8');
  html=html.replace('<script type="module" src="./demo.mjs"></script>',()=>'<script type="module">'+chunk.code.replaceAll('</script','<\\/script')+'</script>');
  await writeFile(path.resolve(root,'..',kind+'.html'),html);
}
