import { createWorldScene } from './worldScene.js';
import { createMapScene } from './mapScene.js';
/** Each scene owns all of its geometry, materials, targets and listeners. Cached source assets belong to ctx. */
export function createSceneManager(ctx){let active=null,key=null;return {
  update(state,alpha){const map=ctx.cameras.selected===5||ctx.cameras.selected===4&&state.current.phase==='CRUISE',next=map?'map':'world';if(next!==key){active?.exit();key=next;active=map?createMapScene():createWorldScene();active.enter(ctx);}active.update(state,alpha);return active;},
  get active(){return active;},exit(){active?.exit();active=null;key=null;}
};}
