// Adapted from the supplied motherboard-preview.html; no external rendering runtime.
type Material = { baseColorFactor: number[]; roughnessFactor: number; metallicFactor: number };
type Coat = { clearcoatFactor?: number; clearcoatRoughnessFactor?: number };
type Part = { vao: WebGLVertexArrayObject; count: number; type: number; offset: number; material: Material; coat?: Coat };
type BoardModel = {
  nodes: { scale?: number[] }[];
  bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
  accessors: { bufferView: number; byteOffset?: number; componentType: number; normalized?: boolean; count: number }[];
  meshes: { primitives: { attributes: Record<string, number>; indices: number; material: number }[] }[];
  materials: { pbrMetallicRoughness: Material; extensions?: { KHR_materials_clearcoat?: Coat } }[];
};

const sub=(a: number[],b: number[])=>a.map((v,i)=>v-b[i]);
const dot=(a: number[],b: number[])=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a: number[],b: number[])=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit=(a: number[])=>{const len=Math.hypot(...a);return a.map(v=>v/len)};
function view(eye: number[],target: number[],up=[0,1,0]){
  const z=unit(sub(eye,target)),x=unit(cross(up,z)),y=cross(z,x);
  return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
}
function product(a: number[],b: number[]){
  return Array.from({length:16},(_,i)=>{
    const col=Math.floor(i/4)*4,row=i%4;
    return a[row]*b[col]+a[row+4]*b[col+1]+a[row+8]*b[col+2]+a[row+12]*b[col+3];
  });
}
function perspective(fov: number,aspect: number,near: number,far: number){
  const s=1/Math.tan(fov/2);
  return [s/aspect,0,0,0, 0,s,0,0, 0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0];
}
function ortho(w: number,h: number,near: number,far: number){
  return [1/w,0,0,0, 0,1/h,0,0, 0,0,-2/(far-near),0, 0,0,-(far+near)/(far-near),1];
}

export function makeRenderer(canvas: HTMLCanvasElement){
  const context=canvas.getContext('webgl2',{antialias:true,alpha:true,premultipliedAlpha:false});
  if(!context) throw new Error('Для просмотра 3D нужен браузер с WebGL 2.');
  const gl = context;
  const buffers: WebGLBuffer[] = [];
  const arrays: WebGLVertexArrayObject[] = [];
  const programs: WebGLProgram[] = [];
  const shaders: WebGLShader[] = [];
  let shadow: WebGLTexture | null = null;
  let framebuffer: WebGLFramebuffer | null = null;
  function dispose() {
    buffers.forEach(buffer => gl.deleteBuffer(buffer));
    arrays.forEach(array => gl.deleteVertexArray(array));
    programs.forEach(program => gl.deleteProgram(program));
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.deleteTexture(shadow);
    gl.deleteFramebuffer(framebuffer);
  }
  try {
    function shader(type: number, source: string){
      const s=gl.createShader(type)!;
      shaders.push(s);
      gl.shaderSource(s,'#version 300 es\n'+source);
      gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'Shader compilation failed');
      return s;
    }
    function program(vertex: string,fragment: string,uniformNames: string[]){
      const p=gl.createProgram()!;
      programs.push(p);
      const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(p,vs);
      gl.attachShader(p,fs);
      gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'Shader linking failed');

      return {p,u:Object.fromEntries(uniformNames.map(n=>[n,gl.getUniformLocation(p,n)]))};
    }
    const depth=program(`
      layout(location=0) in vec3 pos;
      uniform mat4 light;
      uniform vec3 units;
      void main(){gl_Position=light*vec4(pos*units,1.);}
    `,`precision mediump float;void main(){}`,['light','units']);
    const surface=program(`
      layout(location=0) in vec3 pos;
      layout(location=1) in vec3 normal;
      layout(location=2) in vec4 color;
      uniform mat4 camera,light;
      uniform vec3 units;
      out vec3 P,N,shade,lightP;
      void main(){
        P=pos*units;N=normal;shade=color.rgb;
        lightP=(light*vec4(P,1.)).xyz*.5+.5;
        gl_Position=camera*vec4(P,1.);
      }
    `,`
      precision highp float;
      in vec3 P,N,shade,lightP;
      uniform vec3 eye,key,base;
      uniform vec4 material;
      uniform highp sampler2D shadowMap;
      out vec4 result;
      float shadow(float nl){
        float sum=0.;
        float offset=max(.00145,.0035*(1.-nl));
        float pixel=1./1536.;
        for(int i=0;i<4;i++){
          for(int j=0;j<4;j++){
            vec2 uv=lightP.xy+(vec2(float(i),float(j))-1.5)*pixel*1.85;
            sum+=step(lightP.z-offset,texture(shadowMap,uv).r);
          }
        }
        return sum/16.;
      }
      float softbox(vec3 ray,vec3 direction,vec2 size,float roughness){
        vec3 side=normalize(cross(direction,vec3(0.,1.,0.)));
        vec3 up=cross(side,direction);
        float forward=dot(ray,direction);
        vec2 uv=vec2(dot(ray,side),dot(ray,up))/max(forward,.05);
        vec2 edge=abs(uv)/(size+roughness*.52);
        return exp(-dot(edge,edge)*1.5)*smoothstep(0.,.28,forward);
      }
      vec3 studio(vec3 ray,float roughness){
        vec3 overhead=normalize(vec3(.32,.88,-.34));
        vec3 rim=normalize(vec3(-.82,.55,.20));
        vec3 fill=normalize(vec3(.83,.23,.53));
        return vec3(.115
          + softbox(ray,overhead,vec2(.68,.34),roughness)*2.12
          + softbox(ray,rim,vec2(.32,.74),roughness)*1.16
          + softbox(ray,fill,vec2(.25,.47),roughness)*.47);
      }
      void main(){
        vec3 n=normalize(N),v=normalize(eye-P);
        vec3 fill=normalize(vec3(.72,.34,.68)),rim=normalize(vec3(.62,.52,-.58));
        float nl=max(dot(n,key),0.),nv=max(dot(n,v),0.);
        float lit=nl>0.?shadow(nl):1.;
        float upper=n.y*.5+.5;
        float hemi=mix(.33,.40,upper)+.075*(1.-upper)*nv;
        float lambert=hemi+.53*nl*mix(.25,1.,lit)+.19*max(dot(n,fill),0.)+.12*max(dot(n,rim),0.);
        float rough=material.x,metal=material.y;
        vec3 f0=mix(vec3(.042),base,metal*.76);
        float grazing=pow(1.-nv,5.);
        vec3 reflection=reflect(-v,n);
        vec3 f=f0+(vec3(max(1.-rough,.52))-f0)*grazing;
        vec3 diffuse=base*shade*lambert*(1.-metal*.54);
        float cavity=mix(.36,1.,smoothstep(.65,1.,shade.r))*mix(.63,1.,lit);
        vec3 sheen=f*studio(reflection,rough)*cavity;
        float coat=material.z*(.04+.58*grazing);
        vec3 linear=(diffuse+sheen)*(1.-coat)+coat*studio(reflection,material.w)*cavity;
        linear=mix(linear, .82+.18*(1.-exp(-max(linear-.82,vec3(0.))/.18)),step(.82,linear));
        vec3 rgb=mix(linear*12.92,1.055*pow(max(linear,vec3(0.)),vec3(1./2.4))-.055,step(.0031308,linear));
        result=vec4(rgb,1.);
      }
    `,['camera','light','units','eye','key','base','material','shadowMap']);

    const shadowSize=1536;
    shadow=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,shadow);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    framebuffer=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadow,0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error('Не удалось подготовить освещение.');
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    const lamp=[-190,382,-184],key=unit(lamp);
    const light=product(ortho(203,189,130,730),view(lamp,[0,0,0]));
    let units=[1000,1000,1000];
    let parts: Part[]=[];
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    function setModel(buffer: ArrayBuffer){
      const header=new DataView(buffer);
      if(header.getUint32(0,true)!==0x46546c67 || header.getUint32(4,true)!==2) throw new Error('Выберите файл модели GLB версии 2.');
      const jsonSize=header.getUint32(12,true);
      const model = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonSize))) as BoardModel;
      if(header.getUint32(24+jsonSize,true)!==0x004e4942) throw new Error('В файле отсутствует геометрия.');
      const binaryOffset=28+jsonSize;
      units=(model.nodes[0].scale??[1,1,1]).map(n=>n*1000);
      function bytes(viewIndex: number){
        const {byteOffset=0,byteLength}=model.bufferViews[viewIndex];
        return new Uint8Array(buffer,binaryOffset+byteOffset,byteLength);
      }
      // This renderer supports the single mesh and quantized attributes of the supplied GLB.
      // The instance loads once; dispose releases every resource, including a partial upload.
      parts=model.meshes[0].primitives.map(p=>{
        const vao=gl.createVertexArray()!;
        arrays.push(vao);
        gl.bindVertexArray(vao);
        const vertexBuffers=new Map<number, WebGLBuffer>();
        for(const [location,name,size] of [[0,'POSITION',3],[1,'NORMAL',3],[2,'COLOR_0',4]] as const){
          const attr=model.accessors[p.attributes[name]];
          let buf=vertexBuffers.get(attr.bufferView);
          if(!buf){
            buf=gl.createBuffer()!;
            vertexBuffers.set(attr.bufferView,buf);
            buffers.push(buf);
            gl.bindBuffer(gl.ARRAY_BUFFER,buf);
            gl.bufferData(gl.ARRAY_BUFFER,bytes(attr.bufferView),gl.STATIC_DRAW);
          }
          gl.bindBuffer(gl.ARRAY_BUFFER,buf);
          gl.enableVertexAttribArray(location);
          const stride=model.bufferViews[attr.bufferView].byteStride??0;
          gl.vertexAttribPointer(location,size,attr.componentType,Boolean(attr.normalized),stride,attr.byteOffset??0);
        }
        const indices=model.accessors[p.indices],buf=gl.createBuffer()!;
        buffers.push(buf);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,bytes(indices.bufferView),gl.STATIC_DRAW);
        const mat=model.materials[p.material];
        return {vao,count:indices.count,type:indices.componentType,offset:indices.byteOffset ?? 0,material:mat.pbrMetallicRoughness,
          coat:mat.extensions?.KHR_materials_clearcoat};
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.viewport(0,0,shadowSize,shadowSize);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(depth.p);
      gl.uniformMatrix4fv(depth.u.light,false,light);
      gl.uniform3fv(depth.u.units,units);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.5,1);
      for(const part of parts){
        gl.bindVertexArray(part.vao);
        gl.drawElements(gl.TRIANGLES,part.count,part.type,part.offset);
      }
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }
    function draw(az: number,el: number,zoom: number){
      if(!parts.length)return;
      const scale=Math.min(devicePixelRatio,1.5,Math.sqrt(1750000/Math.max(1,canvas.clientWidth*canvas.clientHeight)));
      const width=Math.max(1,Math.round(canvas.clientWidth*scale)),height=Math.max(1,Math.round(canvas.clientHeight*scale));
      if(canvas.width!==width||canvas.height!==height){
        canvas.width=width;
        canvas.height=height;
      }
      const aspect=width/height;
      const distance=zoom*Math.max(1,1.21/aspect);
      const target=[0,4,0];
      const straightOn=Math.abs(el)>=1.5685;
      const sign=Math.sign(el);
      const eye=straightOn?[0,4+distance*sign,0]:
        [distance*Math.sin(az)*Math.cos(el),4+distance*Math.sin(el),distance*Math.cos(az)*Math.cos(el)];
      const up=straightOn?[-Math.sin(az)*sign,0,-Math.cos(az)*sign]:[0,1,0];
      const halfHeight=distance*Math.tan(.31);
      const projection=straightOn?ortho(halfHeight*aspect,halfHeight,8,3000):perspective(.62,aspect,8,3000);
      if(straightOn) projection[13]=.135;
      else projection[9]=-.135;
      const camera=product(projection,view(eye,target,up));
      gl.viewport(0,0,width,height);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(surface.p);
      gl.uniformMatrix4fv(surface.u.camera,false,camera);
      gl.uniformMatrix4fv(surface.u.light,false,light);
      gl.uniform3fv(surface.u.units,units);
      gl.uniform3fv(surface.u.eye,eye);
      gl.uniform3fv(surface.u.key,key);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,shadow);
      gl.uniform1i(surface.u.shadowMap,0);
      for(const part of parts){
        gl.uniform3fv(surface.u.base,part.material.baseColorFactor.slice(0,3));
        gl.uniform4f(surface.u.material,part.material.roughnessFactor,part.material.metallicFactor,
          part.coat?.clearcoatFactor??0,part.coat?.clearcoatRoughnessFactor??0);
        gl.bindVertexArray(part.vao);
        gl.drawElements(gl.TRIANGLES,part.count,part.type,part.offset);
      }
    }
    return {setModel,draw,dispose};
  } catch (error) {
    dispose();
    throw error;
  }
}
