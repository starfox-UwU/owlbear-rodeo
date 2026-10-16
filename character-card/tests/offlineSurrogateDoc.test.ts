import {describe,expect,it} from 'vitest';
import {runInNewContext} from 'node:vm';
import {offlineShell} from '../tools/offlineShell';

/**
 * 宿主的静态服务器（`serve -s` 的 cleanUrls、SPA 回退、CDN 重写）会把找不到的
 * 路径重写成宿主自己的 index.html，也就是用一个 HTML 文档冒充资源文件。
 * 这种响应一旦写进离线缓存，角色卡外壳就永久损坏；这里验证它被拒绝。
 */
function boot(respond:(url:string)=>Response){
 let worker='';const events:Record<string,Function>={},saved=new Map<string,Response>();
 const generated=offlineShell().generateBundle!,hook=(typeof generated==='function'?generated:generated.handler) as Function;
 hook.call({emitFile:(asset:{source:string})=>worker=asset.source},{},{
  'index.html':{type:'asset',source:'<html data-card-startup="loading"></html>'},
  'assets/main.js':{fileName:'assets/main.js',type:'chunk',isEntry:true,imports:[]},
 });
 runInNewContext(worker,{
  URL,Promise,setTimeout,clearTimeout,Error,
  caches:{open:async()=>({put:async(url:string,response:Response)=>saved.set(url,response),match:async(url:string)=>saved.get(url)})},
  fetch:async(url:string)=>respond(url),
  self:{location:new URL('https://example.test/card/sw.js'),addEventListener:(name:string,listener:Function)=>events[name]=listener},
 });
 return {events,saved};
}
function install(events:Record<string,Function>){
 let task!:Promise<void>;events.install({waitUntil:(value:Promise<void>)=>task=value});return task;
}
const html=(body:string)=>new Response(body,{headers:{'content-type':'text/html; charset=utf-8'}});
const script=()=>new Response('asset',{headers:{'content-type':'application/javascript'}});

describe('offline shell rejects documents that are not the character card',()=>{
 it('refuses a shell document the host substituted for index.html',async()=>{
  const {events,saved}=boot(url=>url.endsWith('index.html')?html('<!doctype html><title>Owlbear Rodeo Legacy Edition</title>'):script());
  await expect(install(events)).rejects.toThrow(/replaced by another document/);
  expect([...saved.keys()]).not.toContain('https://example.test/card/index.html');
 });

 it('refuses an asset answered with an HTML document',async()=>{
  const {events,saved}=boot(url=>url.endsWith('index.html')?html('<html data-card-startup="loading"></html>'):html('<!doctype html><title>Owlbear Rodeo Legacy Edition</title>'));
  await expect(install(events)).rejects.toThrow(/replaced by another document/);
  expect([...saved.keys()]).not.toContain('https://example.test/card/assets/main.js');
 });

 it('still caches the real shell',async()=>{
  const {events,saved}=boot(url=>url.endsWith('index.html')?html('<html data-card-startup="loading"><meta name="dnd-card-build" content="abc"/></html>'):script());
  await install(events);
  expect([...saved.keys()].sort()).toEqual([
   'https://example.test/card/assets/main.js',
   'https://example.test/card/dnd-center-icon.png',
   'https://example.test/card/favicon.svg',
   'https://example.test/card/index.html',
  ]);
 });
});
