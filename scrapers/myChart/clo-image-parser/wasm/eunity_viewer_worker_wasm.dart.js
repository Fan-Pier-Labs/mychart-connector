(function dartProgram(){function copyProperties(a,b){var s=Object.keys(a)
for(var r=0;r<s.length;r++){var q=s[r]
b[q]=a[q]}}function mixinProperties(a,b){var s=Object.keys(a)
for(var r=0;r<s.length;r++){var q=s[r]
if(!b.hasOwnProperty(q))b[q]=a[q]}}var z=function(){var s=function(){}
s.prototype={p:{}}
var r=new s()
if(!(r.__proto__&&r.__proto__.p===s.prototype.p))return false
try{if(typeof navigator!="undefined"&&typeof navigator.userAgent=="string"&&navigator.userAgent.indexOf("Chrome/")>=0)return true
if(typeof version=="function"&&version.length==0){var q=version()
if(/^\d+\.\d+\.\d+\.\d+$/.test(q))return true}}catch(p){}return false}()
function setFunctionNamesIfNecessary(a){function t(){};if(typeof t.name=="string")return
for(var s=0;s<a.length;s++){var r=a[s]
var q=Object.keys(r)
for(var p=0;p<q.length;p++){var o=q[p]
var n=r[o]
if(typeof n=="function")n.name=o}}}function inherit(a,b){a.prototype.constructor=a
a.prototype["$i"+a.name]=a
if(b!=null){if(z){a.prototype.__proto__=b.prototype
return}var s=Object.create(b.prototype)
copyProperties(a.prototype,s)
a.prototype=s}}function inheritMany(a,b){for(var s=0;s<b.length;s++)inherit(b[s],a)}function mixin(a,b){mixinProperties(b.prototype,a.prototype)
a.prototype.constructor=a}function lazyOld(a,b,c,d){var s=a
a[b]=s
a[c]=function(){a[c]=function(){H.lk(b)}
var r
var q=d
try{if(a[b]===s){r=a[b]=q
r=a[b]=d()}else r=a[b]}finally{if(r===q)a[b]=null
a[c]=function(){return this[b]}}return r}}function lazy(a,b,c,d){var s=a
a[b]=s
a[c]=function(){if(a[b]===s)a[b]=d()
a[c]=function(){return this[b]}
return a[b]}}function lazyFinal(a,b,c,d){var s=a
a[b]=s
a[c]=function(){if(a[b]===s){var r=d()
if(a[b]!==s)H.ll(b)
a[b]=r}a[c]=function(){return this[b]}
return a[b]}}function makeConstList(a){a.immutable$list=Array
a.fixed$length=Array
return a}function convertToFastObject(a){function t(){}t.prototype=a
new t()
return a}function convertAllToFastObject(a){for(var s=0;s<a.length;++s)convertToFastObject(a[s])}var y=0
function tearOffGetter(a,b,c,d,e){return e?new Function("funcs","applyTrampolineIndex","reflectionInfo","name","H","c","return function tearOff_"+d+y+++"(receiver) {"+"if (c === null) c = "+"H.hl"+"("+"this, funcs, applyTrampolineIndex, reflectionInfo, false, true, name);"+"return new c(this, funcs[0], receiver, name);"+"}")(a,b,c,d,H,null):new Function("funcs","applyTrampolineIndex","reflectionInfo","name","H","c","return function tearOff_"+d+y+++"() {"+"if (c === null) c = "+"H.hl"+"("+"this, funcs, applyTrampolineIndex, reflectionInfo, false, false, name);"+"return new c(this, funcs[0], null, name);"+"}")(a,b,c,d,H,null)}function tearOff(a,b,c,d,e,f){var s=null
return d?function(){if(s===null)s=H.hl(this,a,b,c,true,false,e).prototype
return s}:tearOffGetter(a,b,c,e,f)}var x=0
function installTearOff(a,b,c,d,e,f,g,h,i,j){var s=[]
for(var r=0;r<h.length;r++){var q=h[r]
if(typeof q=="string")q=a[q]
q.$callName=g[r]
s.push(q)}var q=s[0]
q.$R=e
q.$D=f
var p=i
if(typeof p=="number")p+=x
var o=h[0]
q.$stubName=o
var n=tearOff(s,j||0,p,c,o,d)
a[b]=n
if(c)q.$tearOff=n}function installStaticTearOff(a,b,c,d,e,f,g,h){return installTearOff(a,b,true,false,c,d,e,f,g,h)}function installInstanceTearOff(a,b,c,d,e,f,g,h,i){return installTearOff(a,b,false,c,d,e,f,g,h,i)}function setOrUpdateInterceptorsByTag(a){var s=v.interceptorsByTag
if(!s){v.interceptorsByTag=a
return}copyProperties(a,s)}function setOrUpdateLeafTags(a){var s=v.leafTags
if(!s){v.leafTags=a
return}copyProperties(a,s)}function updateTypes(a){var s=v.types
var r=s.length
s.push.apply(s,a)
return r}function updateHolder(a,b){copyProperties(b,a)
return a}var hunkHelpers=function(){var s=function(a,b,c,d,e){return function(f,g,h,i){return installInstanceTearOff(f,g,a,b,c,d,[h],i,e)}},r=function(a,b,c,d){return function(e,f,g,h){return installStaticTearOff(e,f,a,b,c,[g],h,d)}}
return{inherit:inherit,inheritMany:inheritMany,mixin:mixin,installStaticTearOff:installStaticTearOff,installInstanceTearOff:installInstanceTearOff,_instance_0u:s(0,0,null,["$0"],0),_instance_1u:s(0,1,null,["$1"],0),_instance_2u:s(0,2,null,["$2"],0),_instance_0i:s(1,0,null,["$0"],0),_instance_1i:s(1,1,null,["$1"],0),_instance_2i:s(1,2,null,["$2"],0),_static_0:r(0,null,["$0"],0),_static_1:r(1,null,["$1"],0),_static_2:r(2,null,["$2"],0),makeConstList:makeConstList,lazy:lazy,lazyFinal:lazyFinal,lazyOld:lazyOld,updateHolder:updateHolder,convertToFastObject:convertToFastObject,setFunctionNamesIfNecessary:setFunctionNamesIfNecessary,updateTypes:updateTypes,setOrUpdateInterceptorsByTag:setOrUpdateInterceptorsByTag,setOrUpdateLeafTags:setOrUpdateLeafTags}}()
function initializeDeferredHunk(a){x=v.types.length
a(hunkHelpers,v,w,$)}function getGlobalFromName(a){for(var s=0;s<w.length;s++){if(w[s]==C)continue
if(w[s][a])return w[s][a]}}var C={},H={fY:function fY(){},
hk:function(a,b,c){if(a==null)throw H.a(new H.bL(b,c.p("bL<0>")))
return a},
k0:function(a,b,c,d){P.h3(b,"start")
return new H.bT(a,b,c,d.p("bT<0>"))},
jC:function(){return new P.bS("No element")},
cQ:function cQ(a){this.a=a},
bL:function bL(a,b){this.a=a
this.$ti=b},
bs:function bs(){},
aJ:function aJ(){},
bT:function bT(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.$ti=d},
bD:function bD(a,b){var _=this
_.a=a
_.b=b
_.c=0
_.d=null},
ah:function ah(a,b,c){this.a=a
this.b=b
this.$ti=c},
bt:function bt(){},
b9:function b9(a){this.a=a},
iJ:function(a){var s,r=H.iI(a)
if(r!=null)return r
s="minified:"+a
return s},
iF:function(a,b){var s
if(b!=null){s=b.x
if(s!=null)return s}return t.J.b(a)},
d:function(a){var s
if(typeof a=="string")return a
if(typeof a=="number"){if(a!==0)return""+a}else if(!0===a)return"true"
else if(!1===a)return"false"
else if(a==null)return"null"
s=J.az(a)
if(typeof s!="string")throw H.a(H.fA(a))
return s},
bO:function(a){var s=a.$identityHash
if(s==null){s=Math.random()*0x3fffffff|0
a.$identityHash=s}return s},
eM:function(a){return H.jP(a)},
jP:function(a){var s,r,q,p
if(a instanceof P.m)return H.T(H.ax(a),null)
if(J.aT(a)===C.S||t.cr.b(a)){s=C.w(a)
r=s!=="Object"&&s!==""
if(r)return s
q=a.constructor
if(typeof q=="function"){p=q.name
if(typeof p=="string")r=p!=="Object"&&p!==""
else r=!1
if(r)return p}}return H.T(H.ax(a),null)},
C:function(a){var s
if(a<=65535)return String.fromCharCode(a)
if(a<=1114111){s=a-65536
return String.fromCharCode((C.c.L(s,10)|55296)>>>0,s&1023|56320)}throw H.a(P.ap(a,0,1114111,null,null))},
N:function(a){if(a.date===void 0)a.date=new Date(a.a)
return a.date},
jX:function(a){return a.b?H.N(a).getUTCFullYear()+0:H.N(a).getFullYear()+0},
jV:function(a){return a.b?H.N(a).getUTCMonth()+1:H.N(a).getMonth()+1},
jR:function(a){return a.b?H.N(a).getUTCDate()+0:H.N(a).getDate()+0},
jS:function(a){return a.b?H.N(a).getUTCHours()+0:H.N(a).getHours()+0},
jU:function(a){return a.b?H.N(a).getUTCMinutes()+0:H.N(a).getMinutes()+0},
jW:function(a){return a.b?H.N(a).getUTCSeconds()+0:H.N(a).getSeconds()+0},
jT:function(a){return a.b?H.N(a).getUTCMilliseconds()+0:H.N(a).getMilliseconds()+0},
ao:function(a,b,c){var s,r,q={}
q.a=0
s=[]
r=[]
q.a=b.length
C.d.aL(s,b)
q.b=""
if(c!=null&&c.a!==0)c.F(0,new H.eL(q,r,s))
""+q.a
return J.j5(a,new H.ew(C.Y,0,s,r,0))},
jQ:function(a,b,c){var s,r,q,p
if(b instanceof Array)s=c==null||c.a===0
else s=!1
if(s){r=b
q=r.length
if(q===0){if(!!a.$0)return a.$0()}else if(q===1){if(!!a.$1)return a.$1(r[0])}else if(q===2){if(!!a.$2)return a.$2(r[0],r[1])}else if(q===3){if(!!a.$3)return a.$3(r[0],r[1],r[2])}else if(q===4){if(!!a.$4)return a.$4(r[0],r[1],r[2],r[3])}else if(q===5)if(!!a.$5)return a.$5(r[0],r[1],r[2],r[3],r[4])
p=a[""+"$"+q]
if(p!=null)return p.apply(a,r)}return H.jO(a,b,c)},
jO:function(a,b,c){var s,r,q,p,o,n,m,l,k,j,i=b instanceof Array?b:P.h0(b,t.z),h=i.length,g=a.$R
if(h<g)return H.ao(a,i,c)
s=a.$D
r=s==null
q=!r?s():null
p=J.aT(a)
o=p.$C
if(typeof o=="string")o=p[o]
if(r){if(c!=null&&c.a!==0)return H.ao(a,i,c)
if(h===g)return o.apply(a,i)
return H.ao(a,i,c)}if(q instanceof Array){if(c!=null&&c.a!==0)return H.ao(a,i,c)
if(h>g+q.length)return H.ao(a,i,null)
C.d.aL(i,q.slice(h-g))
return o.apply(a,i)}else{if(h>g)return H.ao(a,i,c)
n=Object.keys(q)
if(c==null)for(r=n.length,m=0;m<n.length;n.length===r||(0,H.ay)(n),++m){l=q[n[m]]
if(C.z===l)return H.ao(a,i,c)
C.d.aK(i,l)}else{for(r=n.length,k=0,m=0;m<n.length;n.length===r||(0,H.ay)(n),++m){j=n[m]
if(c.aq(j)){++k
C.d.aK(i,c.n(0,j))}else{l=q[j]
if(C.z===l)return H.ao(a,i,c)
C.d.aK(i,l)}}if(k!==c.a)return H.ao(a,i,c)}return o.apply(a,i)}},
aS:function(a,b){var s,r="index"
if(!H.aQ(b))return new P.a7(!0,b,r,null)
s=J.aW(a)
if(b<0||b>=s)return P.fX(b,a,r,null,s)
return P.eN(b,r)},
fA:function(a){return new P.a7(!0,a,null,null)},
a:function(a){var s,r
if(a==null)a=new P.d1()
s=new Error()
s.dartException=a
r=H.lm
if("defineProperty" in Object){Object.defineProperty(s,"message",{get:r})
s.name=""}else s.toString=r
return s},
lm:function(){return J.az(this.dartException)},
t:function(a){throw H.a(a)},
ay:function(a){throw H.a(P.aC(a))},
ai:function(a){var s,r,q,p,o,n
a=H.li(a.replace(String({}),"$receiver$"))
s=a.match(/\\\$[a-zA-Z]+\\\$/g)
if(s==null)s=H.f([],t.s)
r=s.indexOf("\\$arguments\\$")
q=s.indexOf("\\$argumentsExpr\\$")
p=s.indexOf("\\$expr\\$")
o=s.indexOf("\\$method\\$")
n=s.indexOf("\\$receiver\\$")
return new H.eQ(a.replace(new RegExp("\\\\\\$arguments\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$argumentsExpr\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$expr\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$method\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$receiver\\\\\\$","g"),"((?:x|[^x])*)"),r,q,p,o,n)},
eR:function(a){return function($expr$){var $argumentsExpr$="$arguments$"
try{$expr$.$method$($argumentsExpr$)}catch(s){return s.message}}(a)},
ib:function(a){return function($expr$){try{$expr$.$method$}catch(s){return s.message}}(a)},
fZ:function(a,b){var s=b==null,r=s?null:b.method
return new H.cO(a,r,s?null:b.receiver)},
n:function(a){if(a==null)return new H.eK(a)
if(typeof a!=="object")return a
if("dartException" in a)return H.aU(a,a.dartException)
return H.kV(a)},
aU:function(a,b){if(t.C.b(b))if(b.$thrownJsError==null)b.$thrownJsError=a
return b},
kV:function(a){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e=null
if(!("message" in a))return a
s=a.message
if("number" in a&&typeof a.number=="number"){r=a.number
q=r&65535
if((C.c.L(r,16)&8191)===10)switch(q){case 438:return H.aU(a,H.fZ(H.d(s)+" (Error "+q+")",e))
case 445:case 5007:p=H.d(s)+" (Error "+q+")"
return H.aU(a,new H.bM(p,e))}}if(a instanceof TypeError){o=$.iS()
n=$.iT()
m=$.iU()
l=$.iV()
k=$.iY()
j=$.iZ()
i=$.iX()
$.iW()
h=$.j0()
g=$.j_()
f=o.O(s)
if(f!=null)return H.aU(a,H.fZ(s,f))
else{f=n.O(s)
if(f!=null){f.method="call"
return H.aU(a,H.fZ(s,f))}else{f=m.O(s)
if(f==null){f=l.O(s)
if(f==null){f=k.O(s)
if(f==null){f=j.O(s)
if(f==null){f=i.O(s)
if(f==null){f=l.O(s)
if(f==null){f=h.O(s)
if(f==null){f=g.O(s)
p=f!=null}else p=!0}else p=!0}else p=!0}else p=!0}else p=!0}else p=!0}else p=!0
if(p)return H.aU(a,new H.bM(s,f==null?e:f.method))}}return H.aU(a,new H.de(typeof s=="string"?s:""))}if(a instanceof RangeError){if(typeof s=="string"&&s.indexOf("call stack")!==-1)return new P.bQ()
s=function(b){try{return String(b)}catch(d){}return null}(a)
return H.aU(a,new P.a7(!1,e,e,typeof s=="string"?s.replace(/^RangeError:\s*/,""):s))}if(typeof InternalError=="function"&&a instanceof InternalError)if(typeof s=="string"&&s==="too much recursion")return new P.bQ()
return a},
aw:function(a){var s
if(a==null)return new H.c0(a)
s=a.$cachedTrace
if(s!=null)return s
return a.$cachedTrace=new H.c0(a)},
l0:function(a,b){var s,r,q,p=a.length
for(s=0;s<p;s=q){r=s+1
q=r+1
b.q(0,a[s],a[r])}return b},
l9:function(a,b,c,d,e,f){switch(b){case 0:return a.$0()
case 1:return a.$1(c)
case 2:return a.$2(c,d)
case 3:return a.$3(c,d,e)
case 4:return a.$4(c,d,e,f)}throw H.a(new P.f2("Unsupported number of arguments for wrapped closure"))},
bg:function(a,b){var s
if(a==null)return null
s=a.$identity
if(!!s)return s
s=function(c,d,e){return function(f,g,h,i){return e(c,d,f,g,h,i)}}(a,b,H.l9)
a.$identity=s
return s},
jk:function(a,b,c,d,e,f,g){var s,r,q,p,o,n,m,l=b[0],k=l.$callName,j=e?Object.create(new H.d8().constructor.prototype):Object.create(new H.aY(null,null,null,"").constructor.prototype)
j.$initialize=j.constructor
if(e)s=function static_tear_off(){this.$initialize()}
else{r=$.a9
$.a9=r+1
r=new Function("a,b,c,d"+r,"this.$initialize(a,b,c,d"+r+")")
s=r}j.constructor=s
s.prototype=j
if(!e){q=H.hI(a,l,f)
q.$reflectionInfo=d}else{j.$static_name=g
q=l}j.$S=H.jg(d,e,f)
j[k]=q
for(p=q,o=1;o<b.length;++o){n=b[o]
m=n.$callName
if(m!=null){n=e?n:H.hI(a,n,f)
j[m]=n}if(o===c){n.$reflectionInfo=d
p=n}}j.$C=p
j.$R=l.$R
j.$D=l.$D
return s},
jg:function(a,b,c){var s
if(typeof a=="number")return function(d,e){return function(){return d(e)}}(H.iC,a)
if(typeof a=="string"){if(b)throw H.a("Cannot compute signature for static tearoff.")
s=c?H.j9:H.j8
return function(d,e){return function(){return e(this,d)}}(a,s)}throw H.a("Error in functionType of tearoff")},
jh:function(a,b,c,d){var s=H.hE
switch(b?-1:a){case 0:return function(e,f){return function(){return f(this)[e]()}}(c,s)
case 1:return function(e,f){return function(g){return f(this)[e](g)}}(c,s)
case 2:return function(e,f){return function(g,h){return f(this)[e](g,h)}}(c,s)
case 3:return function(e,f){return function(g,h,i){return f(this)[e](g,h,i)}}(c,s)
case 4:return function(e,f){return function(g,h,i,j){return f(this)[e](g,h,i,j)}}(c,s)
case 5:return function(e,f){return function(g,h,i,j,k){return f(this)[e](g,h,i,j,k)}}(c,s)
default:return function(e,f){return function(){return e.apply(f(this),arguments)}}(d,s)}},
hI:function(a,b,c){var s,r,q,p,o,n,m
if(c)return H.jj(a,b)
s=b.$stubName
r=b.length
q=a[s]
p=b==null?q==null:b===q
o=!p||r>=27
if(o)return H.jh(r,!p,s,b)
if(r===0){p=$.a9
$.a9=p+1
n="self"+H.d(p)
p="return function(){var "+n+" = this."
o=$.bl
return new Function(p+(o==null?$.bl=H.dR("self"):o)+";return "+n+"."+H.d(s)+"();}")()}m="abcdefghijklmnopqrstuvwxyz".split("").splice(0,r).join(",")
p=$.a9
$.a9=p+1
m+=H.d(p)
p="return function("+m+"){return this."
o=$.bl
return new Function(p+(o==null?$.bl=H.dR("self"):o)+"."+H.d(s)+"("+m+");}")()},
ji:function(a,b,c,d){var s=H.hE,r=H.ja
switch(b?-1:a){case 0:throw H.a(new H.d5("Intercepted function with no arguments."))
case 1:return function(e,f,g){return function(){return f(this)[e](g(this))}}(c,s,r)
case 2:return function(e,f,g){return function(h){return f(this)[e](g(this),h)}}(c,s,r)
case 3:return function(e,f,g){return function(h,i){return f(this)[e](g(this),h,i)}}(c,s,r)
case 4:return function(e,f,g){return function(h,i,j){return f(this)[e](g(this),h,i,j)}}(c,s,r)
case 5:return function(e,f,g){return function(h,i,j,k){return f(this)[e](g(this),h,i,j,k)}}(c,s,r)
case 6:return function(e,f,g){return function(h,i,j,k,l){return f(this)[e](g(this),h,i,j,k,l)}}(c,s,r)
default:return function(e,f,g,h){return function(){h=[g(this)]
Array.prototype.push.apply(h,arguments)
return e.apply(f(this),h)}}(d,s,r)}},
jj:function(a,b){var s,r,q,p,o,n,m,l=$.bl
if(l==null)l=$.bl=H.dR("self")
s=$.hD
if(s==null)s=$.hD=H.dR("receiver")
r=b.$stubName
q=b.length
p=a[r]
o=b==null?p==null:b===p
n=!o||q>=28
if(n)return H.ji(q,!o,r,b)
if(q===1){o="return function(){return this."+l+"."+H.d(r)+"(this."+s+");"
n=$.a9
$.a9=n+1
return new Function(o+H.d(n)+"}")()}m="abcdefghijklmnopqrstuvwxyz".split("").splice(0,q-1).join(",")
o="return function("+m+"){return this."+l+"."+H.d(r)+"(this."+s+", "+m+");"
n=$.a9
$.a9=n+1
return new Function(o+H.d(n)+"}")()},
hl:function(a,b,c,d,e,f,g){return H.jk(a,b,c,d,!!e,!!f,g)},
j8:function(a,b){return H.ds(v.typeUniverse,H.ax(a.a),b)},
j9:function(a,b){return H.ds(v.typeUniverse,H.ax(a.c),b)},
hE:function(a){return a.a},
ja:function(a){return a.c},
dR:function(a){var s,r,q,p=new H.aY("self","target","receiver","name"),o=J.hX(Object.getOwnPropertyNames(p))
for(s=o.length,r=0;r<s;++r){q=o[r]
if(p[q]===a)return q}throw H.a(P.x("Field name "+a+" not found."))},
lk:function(a){throw H.a(new P.cy(a))},
iA:function(a){return v.getIsolateTag(a)},
ll:function(a){return H.t(new H.cQ(a))},
jE:function(a,b){return new H.y(a.p("@<0>").X(b).p("y<1,2>"))},
mD:function(a,b,c){Object.defineProperty(a,b,{value:c,enumerable:false,writable:true,configurable:true})},
ld:function(a){var s,r,q,p,o,n=$.iB.$1(a),m=$.fB[n]
if(m!=null){Object.defineProperty(a,v.dispatchPropertyName,{value:m,enumerable:false,writable:true,configurable:true})
return m.i}s=$.fF[n]
if(s!=null)return s
r=v.interceptorsByTag[n]
if(r==null){q=$.ix.$2(a,n)
if(q!=null){m=$.fB[q]
if(m!=null){Object.defineProperty(a,v.dispatchPropertyName,{value:m,enumerable:false,writable:true,configurable:true})
return m.i}s=$.fF[q]
if(s!=null)return s
r=v.interceptorsByTag[q]
n=q}}if(r==null)return null
s=r.prototype
p=n[0]
if(p==="!"){m=H.fH(s)
$.fB[n]=m
Object.defineProperty(a,v.dispatchPropertyName,{value:m,enumerable:false,writable:true,configurable:true})
return m.i}if(p==="~"){$.fF[n]=s
return s}if(p==="-"){o=H.fH(s)
Object.defineProperty(Object.getPrototypeOf(a),v.dispatchPropertyName,{value:o,enumerable:false,writable:true,configurable:true})
return o.i}if(p==="+")return H.iG(a,s)
if(p==="*")throw H.a(P.eS(n))
if(v.leafTags[n]===true){o=H.fH(s)
Object.defineProperty(Object.getPrototypeOf(a),v.dispatchPropertyName,{value:o,enumerable:false,writable:true,configurable:true})
return o.i}else return H.iG(a,s)},
iG:function(a,b){var s=Object.getPrototypeOf(a)
Object.defineProperty(s,v.dispatchPropertyName,{value:J.ho(b,s,null,null),enumerable:false,writable:true,configurable:true})
return b},
fH:function(a){return J.ho(a,!1,null,!!a.$iZ)},
lf:function(a,b,c){var s=b.prototype
if(v.leafTags[a]===true)return H.fH(s)
else return J.ho(s,c,null,null)},
l7:function(){if(!0===$.hn)return
$.hn=!0
H.l8()},
l8:function(){var s,r,q,p,o,n,m,l
$.fB=Object.create(null)
$.fF=Object.create(null)
H.l6()
s=v.interceptorsByTag
r=Object.getOwnPropertyNames(s)
if(typeof window!="undefined"){window
q=function(){}
for(p=0;p<r.length;++p){o=r[p]
n=$.iH.$1(o)
if(n!=null){m=H.lf(o,s[o],n)
if(m!=null){Object.defineProperty(n,v.dispatchPropertyName,{value:m,enumerable:false,writable:true,configurable:true})
q.prototype=n}}}}for(p=0;p<r.length;++p){o=r[p]
if(/^[A-Za-z_]/.test(o)){l=s[o]
s["!"+o]=l
s["~"+o]=l
s["-"+o]=l
s["+"+o]=l
s["*"+o]=l}}},
l6:function(){var s,r,q,p,o,n,m=C.J()
m=H.bf(C.K,H.bf(C.L,H.bf(C.x,H.bf(C.x,H.bf(C.M,H.bf(C.N,H.bf(C.O(C.w),m)))))))
if(typeof dartNativeDispatchHooksTransformer!="undefined"){s=dartNativeDispatchHooksTransformer
if(typeof s=="function")s=[s]
if(s.constructor==Array)for(r=0;r<s.length;++r){q=s[r]
if(typeof q=="function")m=q(m)||m}}p=m.getTag
o=m.getUnknownTag
n=m.prototypeForTag
$.iB=new H.fC(p)
$.ix=new H.fD(o)
$.iH=new H.fE(n)},
bf:function(a,b){return a(b)||b},
li:function(a){if(/[[\]{}()*+?.\\^$|]/.test(a))return a.replace(/[[\]{}()*+?.\\^$|]/g,"\\$&")
return a},
bp:function bp(a,b){this.a=a
this.$ti=b},
bo:function bo(){},
bq:function bq(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.$ti=d},
ew:function ew(a,b,c,d,e){var _=this
_.a=a
_.c=b
_.d=c
_.e=d
_.f=e},
eL:function eL(a,b,c){this.a=a
this.b=b
this.c=c},
eQ:function eQ(a,b,c,d,e,f){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f},
bM:function bM(a,b){this.a=a
this.b=b},
cO:function cO(a,b,c){this.a=a
this.b=b
this.c=c},
de:function de(a){this.a=a},
eK:function eK(a){this.a=a},
c0:function c0(a){this.a=a
this.b=null},
aB:function aB(){},
da:function da(){},
d8:function d8(){},
aY:function aY(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
d5:function d5(a){this.a=a},
fj:function fj(){},
y:function y(a){var _=this
_.a=0
_.f=_.e=_.d=_.c=_.b=null
_.r=0
_.$ti=a},
eC:function eC(a,b){this.a=a
this.b=b
this.c=null},
aI:function aI(a,b){this.a=a
this.$ti=b},
cR:function cR(a,b){var _=this
_.a=a
_.b=b
_.d=_.c=null},
fC:function fC(a){this.a=a},
fD:function fD(a){this.a=a},
fE:function fE(a){this.a=a},
im:function(a,b,c){if(!H.aQ(b))throw H.a(P.x("Invalid view offsetInBytes "+H.d(b)))},
kw:function(a){return a},
eH:function(a,b,c){var s
H.im(a,b,c)
s=new DataView(a,b,c)
return s},
b7:function(a,b,c){H.im(a,b,c)
return c==null?new Uint8Array(a,b):new Uint8Array(a,b,c)},
aj:function(a,b,c){if(a>>>0!==a||a>=c)throw H.a(H.aS(b,a))},
bI:function bI(){},
z:function z(){},
b6:function b6(){},
aM:function aM(){},
R:function R(){},
cW:function cW(){},
cX:function cX(){},
cY:function cY(){},
cZ:function cZ(){},
d_:function d_(){},
bJ:function bJ(){},
bK:function bK(){},
bX:function bX(){},
bY:function bY(){},
bZ:function bZ(){},
c_:function c_(){},
jZ:function(a,b){var s=b.c
return s==null?b.c=H.h9(a,b.z,!0):s},
i7:function(a,b){var s=b.c
return s==null?b.c=H.c2(a,"b3",[b.z]):s},
i8:function(a){var s=a.y
if(s===6||s===7||s===8)return H.i8(a.z)
return s===11||s===12},
jY:function(a){return a.cy},
c9:function(a){return H.fr(v.typeUniverse,a,!1)},
au:function(a,b,a0,a1){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c=b.y
switch(c){case 5:case 1:case 2:case 3:case 4:return b
case 6:s=b.z
r=H.au(a,s,a0,a1)
if(r===s)return b
return H.ij(a,r,!0)
case 7:s=b.z
r=H.au(a,s,a0,a1)
if(r===s)return b
return H.h9(a,r,!0)
case 8:s=b.z
r=H.au(a,s,a0,a1)
if(r===s)return b
return H.ii(a,r,!0)
case 9:q=b.Q
p=H.c8(a,q,a0,a1)
if(p===q)return b
return H.c2(a,b.z,p)
case 10:o=b.z
n=H.au(a,o,a0,a1)
m=b.Q
l=H.c8(a,m,a0,a1)
if(n===o&&l===m)return b
return H.h7(a,n,l)
case 11:k=b.z
j=H.au(a,k,a0,a1)
i=b.Q
h=H.kS(a,i,a0,a1)
if(j===k&&h===i)return b
return H.ih(a,j,h)
case 12:g=b.Q
a1+=g.length
f=H.c8(a,g,a0,a1)
o=b.z
n=H.au(a,o,a0,a1)
if(f===g&&n===o)return b
return H.h8(a,n,f,!0)
case 13:e=b.z
if(e<a1)return b
d=a0[e-a1]
if(d==null)return b
return d
default:throw H.a(P.dK("Attempted to substitute unexpected RTI kind "+c))}},
c8:function(a,b,c,d){var s,r,q,p,o=b.length,n=[]
for(s=!1,r=0;r<o;++r){q=b[r]
p=H.au(a,q,c,d)
if(p!==q)s=!0
n.push(p)}return s?n:b},
kT:function(a,b,c,d){var s,r,q,p,o,n,m=b.length,l=[]
for(s=!1,r=0;r<m;r+=3){q=b[r]
p=b[r+1]
o=b[r+2]
n=H.au(a,o,c,d)
if(n!==o)s=!0
l.push(q)
l.push(p)
l.push(n)}return s?l:b},
kS:function(a,b,c,d){var s,r=b.a,q=H.c8(a,r,c,d),p=b.b,o=H.c8(a,p,c,d),n=b.c,m=H.kT(a,n,c,d)
if(q===r&&o===p&&m===n)return b
s=new H.dj()
s.a=q
s.b=o
s.c=m
return s},
f:function(a,b){a[v.arrayRti]=b
return a},
kZ:function(a){var s=a.$S
if(s!=null){if(typeof s=="number")return H.iC(s)
return a.$S()}return null},
iD:function(a,b){var s
if(H.i8(b))if(a instanceof H.aB){s=H.kZ(a)
if(s!=null)return s}return H.ax(a)},
ax:function(a){var s
if(a instanceof P.m){s=a.$ti
return s!=null?s:H.hf(a)}if(Array.isArray(a))return H.ha(a)
return H.hf(J.aT(a))},
ha:function(a){var s=a[v.arrayRti],r=t.b
if(s==null)return r
if(s.constructor!==r.constructor)return r
return s},
is:function(a){var s=a.$ti
return s!=null?s:H.hf(a)},
hf:function(a){var s=a.constructor,r=s.$ccache
if(r!=null)return r
return H.kC(a,s)},
kC:function(a,b){var s=a instanceof H.aB?a.__proto__.__proto__.constructor:b,r=H.kq(v.typeUniverse,s.name)
b.$ccache=r
return r},
iC:function(a){var s,r=v.types,q=r[a]
if(typeof q=="string"){s=H.fr(v.typeUniverse,q,!1)
r[a]=s
return s}return q},
hm:function(a){var s,r,q,p=a.x
if(p!=null)return p
s=a.cy
r=s.replace(/\*/g,"")
if(r===s)return a.x=new H.dq(a)
q=H.fr(v.typeUniverse,r,!0)
p=q.x
return a.x=p==null?q.x=new H.dq(q):p},
kB:function(a){var s,r,q=this,p=t.K
if(q===p)return H.c5(q,a,H.kF)
if(!H.ak(q))if(!(q===t._))p=q===p
else p=!0
else p=!0
if(p)return H.c5(q,a,H.kI)
p=q.y
s=p===6?q.z:q
if(s===t.S)r=H.aQ
else if(s===t.cb||s===t.cY)r=H.kE
else if(s===t.N)r=H.kG
else r=s===t.y?H.du:null
if(r!=null)return H.c5(q,a,r)
if(s.y===9){p=s.z
if(s.Q.every(H.la)){q.r="$i"+p
return H.c5(q,a,H.kH)}}else if(p===7)return H.c5(q,a,H.kz)
return H.c5(q,a,H.kx)},
c5:function(a,b,c){a.b=c
return a.b(b)},
kA:function(a){var s,r,q=this
if(!H.ak(q))if(!(q===t._))s=q===t.K
else s=!0
else s=!0
if(s)r=H.kt
else if(q===t.K)r=H.kr
else r=H.ky
q.a=r
return q.a(a)},
hi:function(a){var s,r=a.y
if(!H.ak(a))if(!(a===t._))if(!(a===t.F))if(r!==7)s=r===8&&H.hi(a.z)||a===t.P||a===t.T
else s=!0
else s=!0
else s=!0
else s=!0
return s},
kx:function(a){var s=this
if(a==null)return H.hi(s)
return H.E(v.typeUniverse,H.iD(a,s),null,s,null)},
kz:function(a){if(a==null)return!0
return this.z.b(a)},
kH:function(a){var s,r=this
if(a==null)return H.hi(r)
s=r.r
if(a instanceof P.m)return!!a[s]
return!!J.aT(a)[s]},
mB:function(a){var s=this
if(a==null)return a
else if(s.b(a))return a
H.io(a,s)},
ky:function(a){var s=this
if(a==null)return a
else if(s.b(a))return a
H.io(a,s)},
io:function(a,b){throw H.a(H.kg(H.ic(a,H.iD(a,b),H.T(b,null))))},
ic:function(a,b,c){var s=P.ac(a),r=H.T(b==null?H.ax(a):b,null)
return s+": type '"+H.d(r)+"' is not a subtype of type '"+H.d(c)+"'"},
kg:function(a){return new H.c1("TypeError: "+a)},
O:function(a,b){return new H.c1("TypeError: "+H.ic(a,null,b))},
kF:function(a){return a!=null},
kr:function(a){return a},
kI:function(a){return!0},
kt:function(a){return a},
du:function(a){return!0===a||!1===a},
ml:function(a){if(!0===a)return!0
if(!1===a)return!1
throw H.a(H.O(a,"bool"))},
mn:function(a){if(!0===a)return!0
if(!1===a)return!1
if(a==null)return a
throw H.a(H.O(a,"bool"))},
mm:function(a){if(!0===a)return!0
if(!1===a)return!1
if(a==null)return a
throw H.a(H.O(a,"bool?"))},
mo:function(a){if(typeof a=="number")return a
throw H.a(H.O(a,"double"))},
mq:function(a){if(typeof a=="number")return a
if(a==null)return a
throw H.a(H.O(a,"double"))},
mp:function(a){if(typeof a=="number")return a
if(a==null)return a
throw H.a(H.O(a,"double?"))},
aQ:function(a){return typeof a=="number"&&Math.floor(a)===a},
mr:function(a){if(typeof a=="number"&&Math.floor(a)===a)return a
throw H.a(H.O(a,"int"))},
mt:function(a){if(typeof a=="number"&&Math.floor(a)===a)return a
if(a==null)return a
throw H.a(H.O(a,"int"))},
ms:function(a){if(typeof a=="number"&&Math.floor(a)===a)return a
if(a==null)return a
throw H.a(H.O(a,"int?"))},
kE:function(a){return typeof a=="number"},
mu:function(a){if(typeof a=="number")return a
throw H.a(H.O(a,"num"))},
mw:function(a){if(typeof a=="number")return a
if(a==null)return a
throw H.a(H.O(a,"num"))},
mv:function(a){if(typeof a=="number")return a
if(a==null)return a
throw H.a(H.O(a,"num?"))},
kG:function(a){return typeof a=="string"},
mx:function(a){if(typeof a=="string")return a
throw H.a(H.O(a,"String"))},
ks:function(a){if(typeof a=="string")return a
if(a==null)return a
throw H.a(H.O(a,"String"))},
my:function(a){if(typeof a=="string")return a
if(a==null)return a
throw H.a(H.O(a,"String?"))},
kP:function(a,b){var s,r,q
for(s="",r="",q=0;q<a.length;++q,r=", ")s+=C.e.S(r,H.T(a[q],b))
return s},
ip:function(a4,a5,a6){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3=", "
if(a6!=null){s=a6.length
if(a5==null){a5=H.f([],t.s)
r=null}else r=a5.length
q=a5.length
for(p=s;p>0;--p)a5.push("T"+(q+p))
for(o=t.Q,n=t._,m=t.K,l="<",k="",p=0;p<s;++p,k=a3){l=C.e.S(l+k,a5[a5.length-1-p])
j=a6[p]
i=j.y
if(!(i===2||i===3||i===4||i===5||j===o))if(!(j===n))h=j===m
else h=!0
else h=!0
if(!h)l+=C.e.S(" extends ",H.T(j,a5))}l+=">"}else{l=""
r=null}o=a4.z
g=a4.Q
f=g.a
e=f.length
d=g.b
c=d.length
b=g.c
a=b.length
a0=H.T(o,a5)
for(a1="",a2="",p=0;p<e;++p,a2=a3)a1+=C.e.S(a2,H.T(f[p],a5))
if(c>0){a1+=a2+"["
for(a2="",p=0;p<c;++p,a2=a3)a1+=C.e.S(a2,H.T(d[p],a5))
a1+="]"}if(a>0){a1+=a2+"{"
for(a2="",p=0;p<a;p+=3,a2=a3){a1+=a2
if(b[p+1])a1+="required "
a1+=J.hz(H.T(b[p+2],a5)," ")+b[p]}a1+="}"}if(r!=null){a5.toString
a5.length=r}return l+"("+a1+") => "+H.d(a0)},
T:function(a,b){var s,r,q,p,o,n,m=a.y
if(m===5)return"erased"
if(m===2)return"dynamic"
if(m===3)return"void"
if(m===1)return"Never"
if(m===4)return"any"
if(m===6){s=H.T(a.z,b)
return s}if(m===7){r=a.z
s=H.T(r,b)
q=r.y
return J.hz(q===11||q===12?C.e.S("(",s)+")":s,"?")}if(m===8)return"FutureOr<"+H.d(H.T(a.z,b))+">"
if(m===9){p=H.kU(a.z)
o=a.Q
return o.length!==0?p+("<"+H.kP(o,b)+">"):p}if(m===11)return H.ip(a,b,null)
if(m===12)return H.ip(a.z,b,a.Q)
if(m===13){b.toString
n=a.z
return b[b.length-1-n]}return"?"},
kU:function(a){var s,r=H.iI(a)
if(r!=null)return r
s="minified:"+a
return s},
ik:function(a,b){var s=a.tR[b]
for(;typeof s=="string";)s=a.tR[s]
return s},
kq:function(a,b){var s,r,q,p,o,n=a.eT,m=n[b]
if(m==null)return H.fr(a,b,!1)
else if(typeof m=="number"){s=m
r=H.c3(a,5,"#")
q=[]
for(p=0;p<s;++p)q.push(r)
o=H.c2(a,b,q)
n[b]=o
return o}else return m},
ko:function(a,b){return H.il(a.tR,b)},
kn:function(a,b){return H.il(a.eT,b)},
fr:function(a,b,c){var s,r=a.eC,q=r.get(b)
if(q!=null)return q
s=H.ig(H.id(a,null,b,c))
r.set(b,s)
return s},
ds:function(a,b,c){var s,r,q=b.ch
if(q==null)q=b.ch=new Map()
s=q.get(c)
if(s!=null)return s
r=H.ig(H.id(a,b,c,!0))
q.set(c,r)
return r},
kp:function(a,b,c){var s,r,q,p=b.cx
if(p==null)p=b.cx=new Map()
s=c.cy
r=p.get(s)
if(r!=null)return r
q=H.h7(a,b,c.y===10?c.Q:[c])
p.set(s,q)
return q},
at:function(a,b){b.a=H.kA
b.b=H.kB
return b},
c3:function(a,b,c){var s,r,q=a.eC.get(c)
if(q!=null)return q
s=new H.a0(null,null)
s.y=b
s.cy=c
r=H.at(a,s)
a.eC.set(c,r)
return r},
ij:function(a,b,c){var s,r=b.cy+"*",q=a.eC.get(r)
if(q!=null)return q
s=H.kl(a,b,r,c)
a.eC.set(r,s)
return s},
kl:function(a,b,c,d){var s,r,q
if(d){s=b.y
if(!H.ak(b))r=b===t.P||b===t.T||s===7||s===6
else r=!0
if(r)return b}q=new H.a0(null,null)
q.y=6
q.z=b
q.cy=c
return H.at(a,q)},
h9:function(a,b,c){var s,r=b.cy+"?",q=a.eC.get(r)
if(q!=null)return q
s=H.kk(a,b,r,c)
a.eC.set(r,s)
return s},
kk:function(a,b,c,d){var s,r,q,p
if(d){s=b.y
if(!H.ak(b))if(!(b===t.P||b===t.T))if(s!==7)r=s===8&&H.fG(b.z)
else r=!0
else r=!0
else r=!0
if(r)return b
else if(s===1||b===t.F)return t.P
else if(s===6){q=b.z
if(q.y===8&&H.fG(q.z))return q
else return H.jZ(a,b)}}p=new H.a0(null,null)
p.y=7
p.z=b
p.cy=c
return H.at(a,p)},
ii:function(a,b,c){var s,r=b.cy+"/",q=a.eC.get(r)
if(q!=null)return q
s=H.ki(a,b,r,c)
a.eC.set(r,s)
return s},
ki:function(a,b,c,d){var s,r,q
if(d){s=b.y
if(!H.ak(b))if(!(b===t._))r=b===t.K
else r=!0
else r=!0
if(r||b===t.K)return b
else if(s===1)return H.c2(a,"b3",[b])
else if(b===t.P||b===t.T)return t.bc}q=new H.a0(null,null)
q.y=8
q.z=b
q.cy=c
return H.at(a,q)},
km:function(a,b){var s,r,q=""+b+"^",p=a.eC.get(q)
if(p!=null)return p
s=new H.a0(null,null)
s.y=13
s.z=b
s.cy=q
r=H.at(a,s)
a.eC.set(q,r)
return r},
dr:function(a){var s,r,q,p=a.length
for(s="",r="",q=0;q<p;++q,r=",")s+=r+a[q].cy
return s},
kh:function(a){var s,r,q,p,o,n,m=a.length
for(s="",r="",q=0;q<m;q+=3,r=","){p=a[q]
o=a[q+1]?"!":":"
n=a[q+2].cy
s+=r+p+o+n}return s},
c2:function(a,b,c){var s,r,q,p=b
if(c.length!==0)p+="<"+H.dr(c)+">"
s=a.eC.get(p)
if(s!=null)return s
r=new H.a0(null,null)
r.y=9
r.z=b
r.Q=c
if(c.length>0)r.c=c[0]
r.cy=p
q=H.at(a,r)
a.eC.set(p,q)
return q},
h7:function(a,b,c){var s,r,q,p,o,n
if(b.y===10){s=b.z
r=b.Q.concat(c)}else{r=c
s=b}q=s.cy+(";<"+H.dr(r)+">")
p=a.eC.get(q)
if(p!=null)return p
o=new H.a0(null,null)
o.y=10
o.z=s
o.Q=r
o.cy=q
n=H.at(a,o)
a.eC.set(q,n)
return n},
ih:function(a,b,c){var s,r,q,p,o,n=b.cy,m=c.a,l=m.length,k=c.b,j=k.length,i=c.c,h=i.length,g="("+H.dr(m)
if(j>0){s=l>0?",":""
r=H.dr(k)
g+=s+"["+r+"]"}if(h>0){s=l>0?",":""
r=H.kh(i)
g+=s+"{"+r+"}"}q=n+(g+")")
p=a.eC.get(q)
if(p!=null)return p
o=new H.a0(null,null)
o.y=11
o.z=b
o.Q=c
o.cy=q
r=H.at(a,o)
a.eC.set(q,r)
return r},
h8:function(a,b,c,d){var s,r=b.cy+("<"+H.dr(c)+">"),q=a.eC.get(r)
if(q!=null)return q
s=H.kj(a,b,c,r,d)
a.eC.set(r,s)
return s},
kj:function(a,b,c,d,e){var s,r,q,p,o,n,m,l
if(e){s=c.length
r=new Array(s)
for(q=0,p=0;p<s;++p){o=c[p]
if(o.y===1){r[p]=o;++q}}if(q>0){n=H.au(a,b,r,0)
m=H.c8(a,c,r,0)
return H.h8(a,n,m,c!==m)}}l=new H.a0(null,null)
l.y=12
l.z=b
l.Q=c
l.cy=d
return H.at(a,l)},
id:function(a,b,c,d){return{u:a,e:b,r:c,s:[],p:0,n:d}},
ig:function(a){var s,r,q,p,o,n,m,l,k,j,i,h,g=a.r,f=a.s
for(s=g.length,r=0;r<s;){q=g.charCodeAt(r)
if(q>=48&&q<=57)r=H.kb(r+1,q,g,f)
else if((((q|32)>>>0)-97&65535)<26||q===95||q===36)r=H.ie(a,r,g,f,!1)
else if(q===46)r=H.ie(a,r,g,f,!0)
else{++r
switch(q){case 44:break
case 58:f.push(!1)
break
case 33:f.push(!0)
break
case 59:f.push(H.as(a.u,a.e,f.pop()))
break
case 94:f.push(H.km(a.u,f.pop()))
break
case 35:f.push(H.c3(a.u,5,"#"))
break
case 64:f.push(H.c3(a.u,2,"@"))
break
case 126:f.push(H.c3(a.u,3,"~"))
break
case 60:f.push(a.p)
a.p=f.length
break
case 62:p=a.u
o=f.splice(a.p)
H.h6(a.u,a.e,o)
a.p=f.pop()
n=f.pop()
if(typeof n=="string")f.push(H.c2(p,n,o))
else{m=H.as(p,a.e,n)
switch(m.y){case 11:f.push(H.h8(p,m,o,a.n))
break
default:f.push(H.h7(p,m,o))
break}}break
case 38:H.kc(a,f)
break
case 42:l=a.u
f.push(H.ij(l,H.as(l,a.e,f.pop()),a.n))
break
case 63:l=a.u
f.push(H.h9(l,H.as(l,a.e,f.pop()),a.n))
break
case 47:l=a.u
f.push(H.ii(l,H.as(l,a.e,f.pop()),a.n))
break
case 40:f.push(a.p)
a.p=f.length
break
case 41:p=a.u
k=new H.dj()
j=p.sEA
i=p.sEA
n=f.pop()
if(typeof n=="number")switch(n){case-1:j=f.pop()
break
case-2:i=f.pop()
break
default:f.push(n)
break}else f.push(n)
o=f.splice(a.p)
H.h6(a.u,a.e,o)
a.p=f.pop()
k.a=o
k.b=j
k.c=i
f.push(H.ih(p,H.as(p,a.e,f.pop()),k))
break
case 91:f.push(a.p)
a.p=f.length
break
case 93:o=f.splice(a.p)
H.h6(a.u,a.e,o)
a.p=f.pop()
f.push(o)
f.push(-1)
break
case 123:f.push(a.p)
a.p=f.length
break
case 125:o=f.splice(a.p)
H.ke(a.u,a.e,o)
a.p=f.pop()
f.push(o)
f.push(-2)
break
default:throw"Bad character "+q}}}h=f.pop()
return H.as(a.u,a.e,h)},
kb:function(a,b,c,d){var s,r,q=b-48
for(s=c.length;a<s;++a){r=c.charCodeAt(a)
if(!(r>=48&&r<=57))break
q=q*10+(r-48)}d.push(q)
return a},
ie:function(a,b,c,d,e){var s,r,q,p,o,n,m=b+1
for(s=c.length;m<s;++m){r=c.charCodeAt(m)
if(r===46){if(e)break
e=!0}else{if(!((((r|32)>>>0)-97&65535)<26||r===95||r===36))q=r>=48&&r<=57
else q=!0
if(!q)break}}p=c.substring(b,m)
if(e){s=a.u
o=a.e
if(o.y===10)o=o.z
n=H.ik(s,o.z)[p]
if(n==null)H.t('No "'+p+'" in "'+H.jY(o)+'"')
d.push(H.ds(s,o,n))}else d.push(p)
return m},
kc:function(a,b){var s=b.pop()
if(0===s){b.push(H.c3(a.u,1,"0&"))
return}if(1===s){b.push(H.c3(a.u,4,"1&"))
return}throw H.a(P.dK("Unexpected extended operation "+H.d(s)))},
as:function(a,b,c){if(typeof c=="string")return H.c2(a,c,a.sEA)
else if(typeof c=="number")return H.kd(a,b,c)
else return c},
h6:function(a,b,c){var s,r=c.length
for(s=0;s<r;++s)c[s]=H.as(a,b,c[s])},
ke:function(a,b,c){var s,r=c.length
for(s=2;s<r;s+=3)c[s]=H.as(a,b,c[s])},
kd:function(a,b,c){var s,r,q=b.y
if(q===10){if(c===0)return b.z
s=b.Q
r=s.length
if(c<=r)return s[c-1]
c-=r
b=b.z
q=b.y}else if(c===0)return b
if(q!==9)throw H.a(P.dK("Indexed base must be an interface type"))
s=b.Q
if(c<=s.length)return s[c-1]
throw H.a(P.dK("Bad index "+c+" for "+b.h(0)))},
E:function(a,b,c,d,e){var s,r,q,p,o,n,m,l,k,j
if(b===d)return!0
if(!H.ak(d))if(!(d===t._))s=d===t.K
else s=!0
else s=!0
if(s)return!0
r=b.y
if(r===4)return!0
if(H.ak(b))return!1
if(b.y!==1)s=b===t.P||b===t.T
else s=!0
if(s)return!0
q=r===13
if(q)if(H.E(a,c[b.z],c,d,e))return!0
p=d.y
if(r===6)return H.E(a,b.z,c,d,e)
if(p===6){s=d.z
return H.E(a,b,c,s,e)}if(r===8){if(!H.E(a,b.z,c,d,e))return!1
return H.E(a,H.i7(a,b),c,d,e)}if(r===7){s=H.E(a,b.z,c,d,e)
return s}if(p===8){if(H.E(a,b,c,d.z,e))return!0
return H.E(a,b,c,H.i7(a,d),e)}if(p===7){s=H.E(a,b,c,d.z,e)
return s}if(q)return!1
s=r!==11
if((!s||r===12)&&d===t.Z)return!0
if(p===12){if(b===t.g)return!0
if(r!==12)return!1
o=b.Q
n=d.Q
m=o.length
if(m!==n.length)return!1
c=c==null?o:o.concat(c)
e=e==null?n:n.concat(e)
for(l=0;l<m;++l){k=o[l]
j=n[l]
if(!H.E(a,k,c,j,e)||!H.E(a,j,e,k,c))return!1}return H.it(a,b.z,c,d.z,e)}if(p===11){if(b===t.g)return!0
if(s)return!1
return H.it(a,b,c,d,e)}if(r===9){if(p!==9)return!1
return H.kD(a,b,c,d,e)}return!1},
it:function(a2,a3,a4,a5,a6){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1
if(!H.E(a2,a3.z,a4,a5.z,a6))return!1
s=a3.Q
r=a5.Q
q=s.a
p=r.a
o=q.length
n=p.length
if(o>n)return!1
m=n-o
l=s.b
k=r.b
j=l.length
i=k.length
if(o+j<n+i)return!1
for(h=0;h<o;++h){g=q[h]
if(!H.E(a2,p[h],a6,g,a4))return!1}for(h=0;h<m;++h){g=l[h]
if(!H.E(a2,p[o+h],a6,g,a4))return!1}for(h=0;h<i;++h){g=l[m+h]
if(!H.E(a2,k[h],a6,g,a4))return!1}f=s.c
e=r.c
d=f.length
c=e.length
for(b=0,a=0;a<c;a+=3){a0=e[a]
for(;!0;){if(b>=d)return!1
a1=f[b]
b+=3
if(a0<a1)return!1
if(a1<a0)continue
g=f[b-1]
if(!H.E(a2,e[a+2],a6,g,a4))return!1
break}}return!0},
kD:function(a,b,c,d,e){var s,r,q,p,o,n,m,l,k=b.z,j=d.z
if(k===j){s=b.Q
r=d.Q
q=s.length
for(p=0;p<q;++p){o=s[p]
n=r[p]
if(!H.E(a,o,c,n,e))return!1}return!0}if(d===t.K)return!0
m=H.ik(a,k)
if(m==null)return!1
l=m[j]
if(l==null)return!1
q=l.length
r=d.Q
for(p=0;p<q;++p)if(!H.E(a,H.ds(a,b,l[p]),c,r[p],e))return!1
return!0},
fG:function(a){var s,r=a.y
if(!(a===t.P||a===t.T))if(!H.ak(a))if(r!==7)if(!(r===6&&H.fG(a.z)))s=r===8&&H.fG(a.z)
else s=!0
else s=!0
else s=!0
else s=!0
return s},
la:function(a){var s
if(!H.ak(a))if(!(a===t._))s=a===t.K
else s=!0
else s=!0
return s},
ak:function(a){var s=a.y
return s===2||s===3||s===4||s===5||a===t.Q},
il:function(a,b){var s,r,q=Object.keys(b),p=q.length
for(s=0;s<p;++s){r=q[s]
a[r]=b[r]}},
a0:function a0(a,b){var _=this
_.a=a
_.b=b
_.x=_.r=_.c=null
_.y=0
_.cy=_.cx=_.ch=_.Q=_.z=null},
dj:function dj(){this.c=this.b=this.a=null},
dq:function dq(a){this.a=a},
di:function di(){},
c1:function c1(a){this.a=a},
iE:function(a){return t.d.b(a)||t.D.b(a)||t.v.b(a)||t.I.b(a)||t.a1.b(a)||t.cg.b(a)||t.bj.b(a)},
iI:function(a){return v.mangledGlobalNames[a]},
lg:function(a){if(typeof dartPrint=="function"){dartPrint(a)
return}if(typeof console=="object"&&typeof console.log!="undefined"){console.log(a)
return}if(typeof window=="object")return
if(typeof print=="function"){print(a)
return}throw"Unable to print message: "+String(a)}},J={
ho:function(a,b,c,d){return{i:a,p:b,e:c,x:d}},
dv:function(a){var s,r,q,p,o,n=a[v.dispatchPropertyName]
if(n==null)if($.hn==null){H.l7()
n=a[v.dispatchPropertyName]}if(n!=null){s=n.p
if(!1===s)return n.i
if(!0===s)return a
r=Object.getPrototypeOf(a)
if(s===r)return n.i
if(n.e===r)throw H.a(P.eS("Return interceptor for "+H.d(s(a,n))))}q=a.constructor
if(q==null)p=null
else{o=$.ff
if(o==null)o=$.ff=v.getIsolateTag("_$dart_js")
p=q[o]}if(p!=null)return p
p=H.ld(a)
if(p!=null)return p
if(typeof a=="function")return C.U
s=Object.getPrototypeOf(a)
if(s==null)return C.I
if(s===Object.prototype)return C.I
if(typeof q=="function"){o=$.ff
if(o==null)o=$.ff=v.getIsolateTag("_$dart_js")
Object.defineProperty(q,o,{value:C.u,enumerable:false,writable:true,configurable:true})
return C.u}return C.u},
hW:function(a,b){if(a<0||a>4294967295)throw H.a(P.ap(a,0,4294967295,"length",null))
return J.jD(new Array(a),b)},
jD:function(a,b){return J.hX(H.f(a,b.p("r<0>")))},
hX:function(a){a.fixed$length=Array
return a},
aT:function(a){if(typeof a=="number"){if(Math.floor(a)==a)return J.by.prototype
return J.cN.prototype}if(typeof a=="string")return J.am.prototype
if(a==null)return J.b4.prototype
if(typeof a=="boolean")return J.ev.prototype
if(a.constructor==Array)return J.r.prototype
if(typeof a!="object"){if(typeof a=="function")return J.a4.prototype
return a}if(a instanceof P.m)return a
return J.dv(a)},
l1:function(a){if(typeof a=="number")return J.aF.prototype
if(typeof a=="string")return J.am.prototype
if(a==null)return a
if(a.constructor==Array)return J.r.prototype
if(typeof a!="object"){if(typeof a=="function")return J.a4.prototype
return a}if(a instanceof P.m)return a
return J.dv(a)},
av:function(a){if(typeof a=="string")return J.am.prototype
if(a==null)return a
if(a.constructor==Array)return J.r.prototype
if(typeof a!="object"){if(typeof a=="function")return J.a4.prototype
return a}if(a instanceof P.m)return a
return J.dv(a)},
ca:function(a){if(a==null)return a
if(a.constructor==Array)return J.r.prototype
if(typeof a!="object"){if(typeof a=="function")return J.a4.prototype
return a}if(a instanceof P.m)return a
return J.dv(a)},
l2:function(a){if(typeof a=="number")return J.aF.prototype
if(a==null)return a
if(!(a instanceof P.m))return J.ar.prototype
return a},
l3:function(a){if(typeof a=="string")return J.am.prototype
if(a==null)return a
if(!(a instanceof P.m))return J.ar.prototype
return a},
l4:function(a){if(a==null)return a
if(typeof a!="object"){if(typeof a=="function")return J.a4.prototype
return a}if(a instanceof P.m)return a
return J.dv(a)},
l5:function(a){if(a==null)return a
if(!(a instanceof P.m))return J.ar.prototype
return a},
hz:function(a,b){if(typeof a=="number"&&typeof b=="number")return a+b
return J.l1(a).S(a,b)},
k:function(a,b){if(a==null)return b==null
if(typeof a!="object")return b!=null&&a===b
return J.aT(a).J(a,b)},
h:function(a,b){if(typeof b==="number")if(a.constructor==Array||typeof a=="string"||H.iF(a,a[v.dispatchPropertyName]))if(b>>>0===b&&b<a.length)return a[b]
return J.av(a).n(a,b)},
P:function(a,b,c){if(typeof b==="number")if((a.constructor==Array||H.iF(a,a[v.dispatchPropertyName]))&&!a.immutable$list&&b>>>0===b&&b<a.length)return a[b]=c
return J.ca(a).q(a,b,c)},
cc:function(a){return J.ca(a).Y(a)},
hA:function(a,b){return J.ca(a).M(a,b)},
j3:function(a){return J.l4(a).gG(a)},
cd:function(a){return J.aT(a).gv(a)},
ce:function(a){return J.ca(a).gN(a)},
aW:function(a){return J.av(a).gl(a)},
j4:function(a,b,c){return J.ca(a).bE(a,b,c)},
j5:function(a,b){return J.aT(a).au(a,b)},
j6:function(a,b,c){return J.l5(a).bJ(a,b,c)},
aX:function(a){return J.l2(a).k(a)},
az:function(a){return J.aT(a).h(a)},
L:function L(){},
ev:function ev(){},
b4:function b4(){},
an:function an(){},
d3:function d3(){},
ar:function ar(){},
a4:function a4(){},
r:function r(a){this.$ti=a},
ex:function ex(a){this.$ti=a},
bj:function bj(a,b){var _=this
_.a=a
_.b=b
_.c=0
_.d=null},
aF:function aF(){},
by:function by(){},
cN:function cN(){},
am:function am(){}},P={
k5:function(){var s,r,q={}
if(self.scheduleImmediate!=null)return P.kW()
if(self.MutationObserver!=null&&self.document!=null){s=self.document.createElement("div")
r=self.document.createElement("span")
q.a=null
new self.MutationObserver(H.bg(new P.f_(q),1)).observe(s,{childList:true})
return new P.eZ(q,s,r)}else if(self.setImmediate!=null)return P.kX()
return P.kY()},
k6:function(a){self.scheduleImmediate(H.bg(new P.f0(a),0))},
k7:function(a){self.setImmediate(H.bg(new P.f1(a),0))},
k8:function(a){P.kf(0,a)},
kf:function(a,b){var s=new P.fp()
s.cz(a,b)
return s},
dL:function(a,b){var s=H.hk(a,"error",t.K)
return new P.cm(s,b==null?P.hB(a):b)},
hB:function(a){var s
if(t.C.b(a)){s=a.gak()
if(s!=null)return s}return C.P},
h5:function(a,b){var s,r
for(;s=a.a,s===2;)a=a.c
if(s>=4){r=b.aI()
b.a=a.a
b.c=a.c
P.bW(b,r)}else{r=b.c
b.a=2
b.c=a
a.bm(r)}},
bW:function(a,b){var s,r,q,p,o,n,m,l,k,j,i,h,g,f=null,e={},d=e.a=a
for(s=t.c;!0;){r={}
q=d.a===8
if(b==null){if(q){s=d.c
P.hj(f,f,d.b,s.a,s.b)}return}r.a=b
p=b.a
for(d=b;p!=null;d=p,p=o){d.a=null
P.bW(e.a,d)
r.a=p
o=p.a}n=e.a
m=n.c
r.b=q
r.c=m
l=!q
if(l){k=d.c
k=(k&1)!==0||(k&15)===8}else k=!0
if(k){j=d.b.b
if(q){k=n.b===j
k=!(k||k)}else k=!1
if(k){P.hj(f,f,n.b,m.a,m.b)
return}i=$.D
if(i!==j)$.D=j
else i=f
d=d.c
if((d&15)===8)new P.fd(r,e,q).$0()
else if(l){if((d&1)!==0)new P.fc(r,m).$0()}else if((d&2)!==0)new P.fb(e,r).$0()
if(i!=null)$.D=i
d=r.c
if(s.b(d)){n=r.a.$ti
n=n.p("b3<2>").b(d)||!n.Q[1].b(d)}else n=!1
if(n){h=r.a.b
if(d instanceof P.a1)if(d.a>=4){g=h.c
h.c=null
b=h.ap(g)
h.a=d.a
h.c=d.c
e.a=d
continue}else P.h5(d,h)
else h.bd(d)
return}}h=r.a.b
g=h.c
h.c=null
b=h.ap(g)
d=r.b
n=r.c
if(!d){h.a=4
h.c=n}else{h.a=8
h.c=n}e.a=h
d=h}},
kM:function(a,b){if(t.R.b(a))return a
if(t.b6.b(a))return a
throw H.a(P.fT(a,"onError","Error handler must accept one Object or one Object and a StackTrace as arguments, and return a valid result"))},
kK:function(){var s,r
for(s=$.bd;s!=null;s=$.bd){$.c7=null
r=s.b
$.bd=r
if(r==null)$.c6=null
s.a.$0()}},
kR:function(){$.hg=!0
try{P.kK()}finally{$.c7=null
$.hg=!1
if($.bd!=null)$.hw().$1(P.iy())}},
iv:function(a){var s=new P.dg(a),r=$.c6
if(r==null){$.bd=$.c6=s
if(!$.hg)$.hw().$1(P.iy())}else $.c6=r.b=s},
kQ:function(a){var s,r,q,p=$.bd
if(p==null){P.iv(a)
$.c7=$.c6
return}s=new P.dg(a)
r=$.c7
if(r==null){s.b=p
$.bd=$.c7=s}else{q=r.b
s.b=q
$.c7=r.b=s
if(q==null)$.c6=s}},
lj:function(a){var s=null,r=$.D
if(C.i===r){P.be(s,s,C.i,a)
return}P.be(s,s,r,r.br(a))},
hj:function(a,b,c,d,e){P.kQ(new P.fw(d,e))},
iu:function(a,b,c,d){var s,r=$.D
if(r===c)return d.$0()
$.D=c
s=r
try{r=d.$0()
return r}finally{$.D=s}},
kO:function(a,b,c,d,e){var s,r=$.D
if(r===c)return d.$1(e)
$.D=c
s=r
try{r=d.$1(e)
return r}finally{$.D=s}},
kN:function(a,b,c,d,e,f){var s,r=$.D
if(r===c)return d.$2(e,f)
$.D=c
s=r
try{r=d.$2(e,f)
return r}finally{$.D=s}},
be:function(a,b,c,d){if(C.i!==c)d=c.br(d)
P.iv(d)},
f_:function f_(a){this.a=a},
eZ:function eZ(a,b,c){this.a=a
this.b=b
this.c=c},
f0:function f0(a){this.a=a},
f1:function f1(a){this.a=a},
fp:function fp(){},
fq:function fq(a,b){this.a=a
this.b=b},
cm:function cm(a,b){this.a=a
this.b=b},
dh:function dh(){},
bV:function bV(a,b){this.a=a
this.$ti=b},
dk:function dk(a,b,c,d,e){var _=this
_.a=null
_.b=a
_.c=b
_.d=c
_.e=d
_.$ti=e},
a1:function a1(a,b){var _=this
_.a=0
_.b=a
_.c=null
_.$ti=b},
f3:function f3(a,b){this.a=a
this.b=b},
fa:function fa(a,b){this.a=a
this.b=b},
f6:function f6(a){this.a=a},
f7:function f7(a){this.a=a},
f8:function f8(a,b,c){this.a=a
this.b=b
this.c=c},
f5:function f5(a,b){this.a=a
this.b=b},
f9:function f9(a,b){this.a=a
this.b=b},
f4:function f4(a,b,c){this.a=a
this.b=b
this.c=c},
fd:function fd(a,b,c){this.a=a
this.b=b
this.c=c},
fe:function fe(a){this.a=a},
fc:function fc(a,b){this.a=a
this.b=b},
fb:function fb(a,b){this.a=a
this.b=b},
dg:function dg(a){this.a=a
this.b=null},
d9:function d9(){},
fs:function fs(){},
fw:function fw(a,b){this.a=a
this.b=b},
fk:function fk(){},
fl:function fl(a,b){this.a=a
this.b=b},
jF:function(a,b,c){return H.l0(a,new H.y(b.p("@<0>").X(c).p("y<1,2>")))},
cS:function(a,b){return new H.y(a.p("@<0>").X(b).p("y<1,2>"))},
jB:function(a,b,c){var s,r
if(P.hh(a)){if(b==="("&&c===")")return"(...)"
return b+"..."+c}s=H.f([],t.s)
$.aR.push(a)
try{P.kJ(a,s)}finally{$.aR.pop()}r=P.i9(b,s,", ")+c
return r.charCodeAt(0)==0?r:r},
hV:function(a,b,c){var s,r
if(P.hh(a))return b+"..."+c
s=new P.aq(b)
$.aR.push(a)
try{r=s
r.a=P.i9(r.a,a,", ")}finally{$.aR.pop()}s.a+=c
r=s.a
return r.charCodeAt(0)==0?r:r},
hh:function(a){var s,r
for(s=$.aR.length,r=0;r<s;++r)if(a===$.aR[r])return!0
return!1},
kJ:function(a,b){var s,r,q,p,o,n,m,l=a.gN(a),k=0,j=0
while(!0){if(!(k<80||j<3))break
if(!l.B())return
s=H.d(l.gC())
b.push(s)
k+=s.length+2;++j}if(!l.B()){if(j<=5)return
r=b.pop()
q=b.pop()}else{p=l.gC();++j
if(!l.B()){if(j<=4){b.push(H.d(p))
return}r=H.d(p)
q=b.pop()
k+=r.length+2}else{o=l.gC();++j
for(;l.B();p=o,o=n){n=l.gC();++j
if(j>100){while(!0){if(!(k>75&&j>3))break
k-=b.pop().length+2;--j}b.push("...")
return}}q=H.d(p)
r=H.d(o)
k+=r.length+q.length+4}}if(j>b.length+2){k+=5
m="..."}else m=null
while(!0){if(!(k>80&&b.length>3))break
k-=b.pop().length+2
if(m==null){k+=5
m="..."}}if(m!=null)b.push(m)
b.push(q)
b.push(r)},
eF:function(a){var s,r={}
if(P.hh(a))return"{...}"
s=new P.aq("")
try{$.aR.push(a)
s.a+="{"
r.a=!0
a.F(0,new P.eG(r,s))
s.a+="}"}finally{$.aR.pop()}r=s.a
return r.charCodeAt(0)==0?r:r},
q:function q(){},
bE:function bE(){},
eG:function eG(a,b){this.a=a
this.b=b},
aL:function aL(){},
dt:function dt(){},
bF:function bF(){},
bU:function bU(){},
c4:function c4(){},
kL:function(a,b){var s,r,q,p
if(typeof a!="string")throw H.a(H.fA(a))
s=null
try{s=JSON.parse(a)}catch(q){r=H.n(q)
p=P.jz(String(r))
throw H.a(p)}p=P.ft(s)
return p},
ft:function(a){var s
if(a==null)return null
if(typeof a!="object")return a
if(Object.getPrototypeOf(a)!==Array.prototype)return new P.dl(a,Object.create(null))
for(s=0;s<a.length;++s)a[s]=P.ft(a[s])
return a},
i_:function(a,b,c){return new P.bB(a,b)},
kv:function(a){return a.ef()},
k9:function(a,b){return new P.fg(a,[],P.l_())},
ka:function(a,b,c){var s,r=new P.aq(""),q=P.k9(r,b)
q.ax(a)
s=r.a
return s.charCodeAt(0)==0?s:s},
dl:function dl(a,b){this.a=a
this.b=b
this.c=null},
dm:function dm(a){this.a=a},
cq:function cq(){},
cw:function cw(){},
bB:function bB(a,b){this.a=a
this.b=b},
cP:function cP(a,b){this.a=a
this.b=b},
ey:function ey(){},
eA:function eA(a){this.b=a},
ez:function ez(a){this.a=a},
fh:function fh(){},
fi:function fi(a,b){this.a=a
this.b=b},
fg:function fg(a,b,c){this.c=a
this.a=b
this.b=c},
jv:function(a){if(a instanceof H.aB)return a.h(0)
return"Instance of '"+H.d(H.eM(a))+"'"},
hQ:function(a,b){var s
if(Math.abs(a)<=864e13)s=!1
else s=!0
if(s)H.t(P.x("DateTime is outside valid range: "+a))
H.hk(b,"isUtc",t.y)
return new P.b_(a,b)},
h_:function(a,b,c,d){var s,r=J.hW(a,d)
if(a!==0&&b!=null)for(s=0;s<a;++s)r[s]=b
return r},
h0:function(a,b){var s,r=H.f([],b.p("r<0>"))
for(s=J.ce(a);s.B();)r.push(s.gC())
return r},
i9:function(a,b,c){var s=J.ce(b)
if(!s.B())return a
if(c.length===0){do a+=H.d(s.gC())
while(s.B())}else{a+=H.d(s.gC())
for(;s.B();)a=a+c+H.d(s.gC())}return a},
i4:function(a,b,c,d){return new P.d0(a,b,c,d)},
k_:function(){var s,r
if($.j2())return H.aw(new Error())
try{throw H.a("")}catch(r){H.n(r)
s=H.aw(r)
return s}},
jt:function(a){var s=Math.abs(a),r=a<0?"-":""
if(s>=1000)return""+a
if(s>=100)return r+"0"+s
if(s>=10)return r+"00"+s
return r+"000"+s},
ju:function(a){if(a>=100)return""+a
if(a>=10)return"0"+a
return"00"+a},
cA:function(a){if(a>=10)return""+a
return"0"+a},
ac:function(a){if(typeof a=="number"||H.du(a)||null==a)return J.az(a)
if(typeof a=="string")return JSON.stringify(a)
return P.jv(a)},
dK:function(a){return new P.cl(a)},
x:function(a){return new P.a7(!1,null,null,a)},
fT:function(a,b,c){return new P.a7(!0,a,b,c)},
bP:function(a){var s=null
return new P.b8(s,s,!1,s,s,a)},
eN:function(a,b){return new P.b8(null,null,!0,a,b,"Value not in range")},
ap:function(a,b,c,d,e){return new P.b8(b,c,!0,a,d,"Invalid value")},
h4:function(a,b,c){if(0>a||a>c)throw H.a(P.ap(a,0,c,"start",null))
if(b!=null){if(a>b||b>c)throw H.a(P.ap(b,a,c,"end",null))
return b}return c},
h3:function(a,b){if(a<0)throw H.a(P.ap(a,0,null,b,null))
return a},
fX:function(a,b,c,d,e){var s=e==null?J.aW(b):e
return new P.cM(s,!0,a,c,"Index out of range")},
aP:function(a){return new P.df(a)},
eS:function(a){return new P.dd(a)},
d7:function(a){return new P.bS(a)},
aC:function(a){return new P.cu(a)},
jz:function(a){return new P.er(a)},
eI:function eI(a,b){this.a=a
this.b=b},
b_:function b_(a,b){this.a=a
this.b=b},
l:function l(){},
cl:function cl(a){this.a=a},
dc:function dc(){},
d1:function d1(){},
a7:function a7(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
b8:function b8(a,b,c,d,e,f){var _=this
_.e=a
_.f=b
_.a=c
_.b=d
_.c=e
_.d=f},
cM:function cM(a,b,c,d,e){var _=this
_.f=a
_.a=b
_.b=c
_.c=d
_.d=e},
d0:function d0(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
df:function df(a){this.a=a},
dd:function dd(a){this.a=a},
bS:function bS(a){this.a=a},
cu:function cu(a){this.a=a},
bQ:function bQ(){},
cy:function cy(a){this.a=a},
f2:function f2(a){this.a=a},
er:function er(a){this.a=a},
af:function af(){},
G:function G(){},
m:function m(){},
dn:function dn(){},
aq:function aq(a){this.a=a},
fm:function fm(){},
fn:function fn(a,b){this.a=a
this.b=b},
fo:function fo(a,b){this.a=a
this.b=b},
eW:function eW(){},
eY:function eY(a,b){this.a=a
this.b=b},
dp:function dp(a,b){this.a=a
this.b=b},
eX:function eX(a,b){this.a=a
this.b=b
this.c=!1},
bC:function bC(){},
ku:function(a,b,c,d){var s,r,q
if(b){s=[c]
C.d.aL(s,d)
d=s}r=t.z
q=P.h0(J.j4(d,P.lb(),r),r)
return P.hc(H.jQ(a,q,null))},
hd:function(a,b,c){var s
try{if(Object.isExtensible(a)&&!Object.prototype.hasOwnProperty.call(a,b)){Object.defineProperty(a,b,{value:c})
return!0}}catch(s){H.n(s)}return!1},
ir:function(a,b){if(Object.prototype.hasOwnProperty.call(a,b))return a[b]
return null},
hc:function(a){if(a==null||typeof a=="string"||typeof a=="number"||H.du(a))return a
if(a instanceof P.ag)return a.a
if(H.iE(a))return a
if(t.h.b(a))return a
if(a instanceof P.b_)return H.N(a)
if(t.Z.b(a))return P.iq(a,"$dart_jsFunction",new P.fu())
return P.iq(a,"_$dart_jsObject",new P.fv($.hy()))},
iq:function(a,b,c){var s=P.ir(a,b)
if(s==null){s=c.$1(a)
P.hd(a,b,s)}return s},
hb:function(a){if(a==null||typeof a=="string"||typeof a=="number"||typeof a=="boolean")return a
else if(a instanceof Object&&H.iE(a))return a
else if(a instanceof Object&&t.h.b(a))return a
else if(a instanceof Date)return P.hQ(a.getTime(),!1)
else if(a.constructor===$.hy())return a.o
else return P.iw(a)},
iw:function(a){if(typeof a=="function")return P.he(a,$.fR(),new P.fx())
if(a instanceof Array)return P.he(a,$.hx(),new P.fy())
return P.he(a,$.hx(),new P.fz())},
he:function(a,b,c){var s=P.ir(a,b)
if(s==null||!(a instanceof Object)){s=c.$1(a)
P.hd(a,b,s)}return s},
fu:function fu(){},
fv:function fv(a){this.a=a},
fx:function fx(){},
fy:function fy(){},
fz:function fz(){},
ag:function ag(a){this.a=a},
bA:function bA(a){this.a=a},
aG:function aG(a,b){this.a=a
this.$ti=b},
bc:function bc(){},
lh:function(a,b){var s=new P.a1($.D,b.p("a1<0>")),r=new P.bV(s,b.p("bV<0>"))
a.then(H.bg(new P.fI(r),1),H.bg(new P.fJ(r),1))
return s},
eJ:function eJ(a){this.a=a},
fI:function fI(a){this.a=a},
fJ:function fJ(a){this.a=a},
cC:function cC(){}},W={c:function c(){},cj:function cj(){},ck:function ck(){},aA:function aA(){},cn:function cn(){},a3:function a3(){},ct:function ct(){},aD:function aD(){},em:function em(){},b:function b(){},e:function e(){},cD:function cD(){},A:function A(){},cE:function cE(){},b0:function b0(){},cH:function cH(){},bw:function bw(){},cU:function cU(){},bH:function bH(){},cV:function cV(){},v:function v(){},d2:function d2(){},d4:function d4(){},d6:function d6(){},db:function db(){},S:function S(){},bb:function bb(){},a5:function a5(){}},B={
js:function(a,b,c,d){var s=new B.cz()
s.a=a
s.c=c
s.d=d
return s},
cz:function cz(){this.a=0
this.d=this.c=""},
dM:function dM(){}},K={cK:function cK(a,b,c){var _=this
_.a=a
_.b=b
_.e=_.c=0
_.x=_.f=null
_.$ti=c},
aa:function(a,b,c){var s=new K.cs()
s.a=a
s.b=b
return s},
cs:function cs(){this.a=0
this.b=null},
jr:function(a,b,c){var s
if(a===5){if(c)s=b===1||b===2
else s=!1
if(s)return!0
return!1}return K.fU(a,b)>1},
fU:function(a,b){if(a===5){if(b===1||b===2)return 2
return 1}if(a===0||a===1||a===2||!1)return 2
return 1},
jq:function(a,b){if(a===0||a===10)return b===0||b===1||b===3
return!1},
hO:function(a){if(a===10||a===11||a===12||a===13)return $.iK()
else return $.iL()},
e4:function e4(){},
hN:function(){var s=M.jc(16)
s.sl(0,16)
s.a=!0
return s},
e5:function e5(){},
k4:function(){return new K.eU()},
eU:function eU(){this.b=this.a=null}},Y={cL:function cL(){this.b=null},
hK:function(a,b){var s=a*b
if(s===2)return $.jn
else if(s===4)return $.jo
return $.jm},
jl:function(a,b){if(a&&b.k1>1)return 2
return 1},
aZ:function aZ(){var _=this
_.k3=_.k2=null
_.k4=!1
_.r=_.f=_.e=_.r1=null
_.y=_.x=!1
_.z=null
_.ch=_.Q=0
_.cx=!1
_.cy=0
_.fx=_.fr=_.dy=_.dx=_.db=null
_.a=0
_.b=null
_.d=_.c=0},
e1:function e1(a){this.a=a},
e2:function e2(a,b){this.a=a
this.b=b},
eB:function eB(){var _=this
_.d=_.c=_.b=_.a=null
_.e=0},
dz:function dz(){},
aO:function aO(){var _=this
_.ch=null
_.f=_.e=0
_.r=null
_.a=0
_.b=null
_.d=_.c=0},
aH:function aH(a,b){this.a=a
this.b=b},
cF:function(a){return a},
jx:function(a){if(typeof a=="number")return a
if(a==null)return 0
return 0/0},
jw:function(a){return a},
i:function(a){var s,r,q,p,o,n,m=a.length
if(m===0)return null
if(m===1)return C.d.gdd(a)
for(s=!1,r=null,q=!1,p=null,o=0;o<a.length;a.length===m||(0,H.ay)(a),++o){n=a[o]
if(q){if(p==null)p=new P.aq(H.d(r))
p.a+=H.d(n)}else{if(s)r=Y.u(r,n)
else{r=n
s=!0}q=typeof r=="string"}}if(p!=null){m=p.a
return m.charCodeAt(0)==0?m:m}else return r},
u:function(a,b){var s,r,q=a==null,p=b==null
if(q&&p)return 0
s=typeof b=="number"
if(typeof a=="number"){if(s)return a+b
if(p)return a}else if(s&&q)return b
r=H.d(a)+H.d(b)
return r.charCodeAt(0)==0?r:r}},S={aN:function aN(){this.d=this.b=null},eO:function eO(){var _=this
_.y=_.x=_.r=_.f=_.e=null
_.z=!1
_.a=0
_.b=null
_.d=_.c=0},
Q:function(a){var s=new S.cJ(a)
s.b="FlashError"
return s},
cJ:function cJ(a){this.a=a
this.b=null},
le:function(){H.lg("Worker_wasm created")
var s=H.f([],t.V)
s=new L.eV(s)
s.ct(new M.dQ(),$.j7)
s.cL()}},L={eV:function eV(a){var _=this
_.d=null
_.e=a
_.c=_.a=null},cf:function cf(){},dA:function dA(a){this.a=a},dC:function dC(a,b){this.a=a
this.b=b},dD:function dD(a){this.a=a},dB:function dB(a){this.a=a},eu:function eu(){var _=this
_.ch=null
_.f=_.e=0
_.r=null
_.a=0
_.b=null
_.d=_.c=0},dO:function dO(){var _=this
_.a=!1
_.b=0
_.c=9999
_.e=_.d=!0}},Q={
jy:function(a,b){var s,r=new P.aq(a)
C.d.F(b,new Q.eq(r))
s=r.a
return s.charCodeAt(0)==0?s:s},
eq:function eq(a){this.a=a},
dx:function dx(){},
dy:function dy(a,b,c){this.a=a
this.b=b
this.c=c},
bk:function bk(a){this.a=a
this.c=this.b=0},
aK:function(a){return new Float64Array(H.kw(H.f([a.a,a.b,a.c,a.d],t.m)))},
jJ:function(a){return a.ds()},
h2:function(){var s,r=$.p().n(0,"HEAPU8"),q=$.h1
if(q!=null){s=$.eE
s=r==null?s!=null:r!==s}else s=!0
if(s){$.eE=r
q=$.h1=M.jb(r)}return q},
jM:function(a,b,c){if(b===0)return-1
a.ag(Q.h2(),b,c)
return 0},
jK:function(a,b,c,d){var s
if(d<=0)return 0
if(a===0)return-1
if(b==null)return-10
if(b.e<c+d)return-20
s=Q.h2()
s.sP(0,J.aX(a))
s.ag(b,c,d)
return 0},
jL:function(a,b,c){if(c<=0)return 0
if(a===0)return-1
if(b.ga5()<c)return-20
b.av(Q.h2(),J.aX(a),c)
return 0},
i1:function(a,b,c){var s,r,q,p,o=0
try{r=H.f([c],t.i)
o=$.p().t("alloc",r)
s=Q.jK(o,a,b,c)
if(!J.k(s,0))return 0
q=o
return q}catch(p){if(t.k.b(H.n(p))){if(!J.k(o,0)){r=H.f([o],t.l)
$.p().t("free",r)}return 0}else throw p}return o},
jH:function(a,b){var s,r,q,p,o=0
try{r=H.f([b],t.i)
o=$.p().t("alloc",r)
s=Q.jL(o,a,b)
if(!J.k(s,0))return 0
q=o
return q}catch(p){if(t.k.b(H.n(p))){if(!J.k(o,0)){r=H.f([o],t.l)
$.p().t("free",r)}return 0}else throw p}return o},
i2:function(a,b,c,d){var s,r
if(a==null)throw H.a(U.aE("blockByteArray is null",0))
s=a.e
r=H.f([Q.jJ(a),s,b,c,d],t.M)
s=$.p().t("internalDecompressTypeNative",r)
if(s<0)throw H.a(U.aE("Unable to decompress zlib or zstd data in native code.",0))
if(s!==c)throw H.a(U.aE("Decompressed block gave "+H.d(s)+" bytes instead of the calculated "+c,0))
return b},
jI:function(a,b,c,d){var s,r=a.length
if(b.length<r||c.length<r)throw H.a(U.aE("DestinationPointers or decompressedBytes Vectors are not at least of size "+r,0))
for(s=0;s<r;++s)if(Q.i2(a[s],b[s],c[s],d)===0)throw H.a(U.aE("Error decompressing block "+s,0))
return},
eP:function eP(){this.b=this.a=0}},U={
al:function(a){var s=new U.cB(a)
s.b="FlashError"
s.b="IOError"
s.b="EOFError"
return s},
aE:function(a,b){var s=new U.bu(a)
s.b="FlashError"
return s},
J:function(a){var s,r=null
try{r=a.gW(a)}catch(s){if(t.k.b(H.n(s)))r=""
else throw s}return r},
b1:function(a){var s,r=null
try{r=a.gae(a)}catch(s){if(t.k.b(H.n(s)))r=""
else throw s}return r},
hR:function(a){var s,r=null
try{r=J.az(a.gak())}catch(s){if(t.k.b(H.n(s)))r=""
else throw s}return r},
hS:function(a,b){var s=new U.bv(a)
s.b="FlashError"
s.b="IOError"
return s},
U:function(a){var s=new U.cT("")
s.b="FlashError"
s.a=a
return s},
cB:function cB(a){this.a=a
this.b=null},
bu:function bu(a){this.a=a
this.b=null},
bv:function bv(a){this.a=a
this.b=null},
cT:function cT(a){this.a=a
this.b=null},
bi:function bi(){},
bN:function bN(a,b,c){this.a=a
this.b=b
this.$ti=c},
w:function w(a,b,c,d,e){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.$ti=e}},M={
hG:function(a,b,c){var s,r=new M.a8(512,3),q=a.byteOffset
if(c===0)c=a.byteLength-b
s=q+b
r.r=H.eH(a.buffer,s,c)
r.x=H.b7(a.buffer,s,c)
r.c=0
r.f=r.e=r.d=c
r.z=r.y=!1
return r},
jb:function(a){var s,r,q,p=new M.a8(512,3)
if(a==null)H.t(P.x("inputData is null"))
s=a.byteOffset
r=a.byteLength
q=r-0
p.r=H.eH(a.buffer,s,q)
p.x=H.b7(a.buffer,s,q)
p.c=0
p.f=p.e=p.d=q
p.z=p.y=!0
return p},
jc:function(a){var s=new M.a8(a,3)
s.Y(0)
return s},
hF:function(){var s=new M.a8(null,3)
s.Q=512
s.Y(0)
return s},
jd:function(a,b,c){var s=M.hG(a,b,c)
return s},
a8:function a8(a,b){var _=this
_.z=_.y=_.x=_.r=_.f=_.e=_.d=_.c=null
_.Q=a
_.a=!1
_.b=b},
dN:function dN(a){this.b=null
this.a=a},
cg:function cg(){},
X:function X(){var _=this
_.e=_.d=_.c=_.b=_.a=null},
dQ:function dQ(){this.a=null},
cv:function cv(a){this.a=a
this.b=null}},N={
hC:function(a){var s=new N.dP()
s.a=a
return s},
dP:function dP(){this.a=0},
et:function et(a){this.a=a}},T={
hM:function(a){var s=new T.e3()
s.a=a
return s},
jp:function(a){if(a===0)return $.iO()
else if(a===1)return $.iP()
return null},
e3:function e3(){this.a=0},
br:function br(){var _=this
_.f=_.e=0
_.r=null
_.a=0
_.b=null
_.d=_.c=0}},F={ch:function ch(){this.c=this.b=this.a=0},bn:function bn(){var _=this
_.r=_.f=_.e=_.k3=_.k2=null
_.y=_.x=!1
_.z=null
_.ch=_.Q=0
_.cx=!1
_.cy=0
_.fx=_.fr=_.dy=_.dx=_.db=null
_.a=0
_.b=null
_.d=_.c=0},e_:function e_(a){this.a=a},e0:function e0(a,b){this.a=a
this.b=b},bx:function bx(){var _=this
_.r=_.f=_.e=_.d=_.c=_.b=_.a=0
_.y=_.x=!1
_.Q=null},
M:function(a){return $.jG.dG(a,new F.eD(a))},
b5:function b5(a,b,c){var _=this
_.a=a
_.b=b
_.c=null
_.d=c},
eD:function eD(a){this.a=a}},A={ci:function ci(){},dJ:function dJ(a){this.a=a},dI:function dI(a){this.a=a},dH:function dH(a){this.a=a},dG:function dG(a){this.a=a},dE:function dE(a,b){this.a=a
this.b=b},dF:function dF(a){this.a=a},
je:function(a){switch(a){case 0:return C.Q
case 1:return C.o
case 2:return C.A
default:return null}},
bm:function bm(a,b){this.a=a
this.b=b},
hJ:function(a,b){var s,r,q=a.ga5()
if(q<b){s=Y.i(["CompressedBaseTileData.skipStream: Not enough decompressed bytes. Trying to read ",b," from IDataInput when only ",q," were available"])
$.I().i(C.b,s,null,null)
throw H.a(U.al(s))}r=a.c
a.sP(0,r+b)},
ab:function ab(){},
dW:function dW(a,b){this.a=a
this.b=b},
dX:function dX(a,b){this.a=a
this.b=b},
dY:function dY(a){this.a=a},
dV:function dV(a,b){this.a=a
this.b=b},
dZ:function dZ(a,b){this.a=a
this.b=b},
dT:function dT(a){this.a=a},
dU:function dU(a){this.a=a},
dS:function dS(a){this.a=a}},R={es:function es(){},en:function en(){},eo:function eo(){},ep:function ep(){},
fV:function(a){var s=H.f([],t.n)
C.d.sl(s,a)
C.d.ad(s,0,a,!1)
return s},
ad:function(a){var s=H.f([],t.i)
C.d.sl(s,a)
C.d.ad(s,0,a,0)
return s},
cG:function(a){var s=H.f([],t.l)
C.d.sl(s,a)
C.d.ad(s,0,a,0)
return s},
ae:function(a,b,c){var s,r
if(b){s=new Array(a)
s.fixed$length=Array
return H.f(s,c.p("r<0*>"))}r=H.f([],c.p("r<0*>"))
C.d.sl(r,a)
return r}},V={
hH:function(a,b,c){var s=new V.co(H.f([],t.H))
s.a=a
s.b=b
s.c=c
return s},
co:function co(a){var _=this
_.a=0
_.c=_.b=null
_.d=a}},D={cr:function cr(){this.c=this.b=this.a=null},
bG:function(a,b){var s=Math.max(a,b)
return s},
i3:function(a,b){var s=Math.min(a,b)
return s}},O={
hP:function(a,b,c,d,e,f){var s=new O.cx()
s.cr(a,b,c,e,!1)
s.ch=d
return s},
cx:function cx(){var _=this
_.k1=1
_.r1=_.k4=_.k3=_.k2=0
_.ch=_.x1=_.ry=_.rx=_.r2=null
_.d=_.c=_.b=0
_.e=null
_.f=!1
_.y=null
_.z=!1},
e6:function e6(a){this.a=a},
e7:function e7(a,b){var _=this
_.a=a
_.b=!0
_.c=null
_.d=0
_.e=!1
_.r=_.f=0
_.x=1
_.ch=_.Q=_.z=_.y=0
_.cx="CLHAAR"
_.cy=!1
_.db=100
_.fy=_.fx=_.fr=_.dy=_.dx=0
_.r1=_.k4=_.k3=_.k2=_.k1=_.id=_.go=-1
_.r2=!1
_.ry=_.rx=null
_.x1=0
_.y1=_.x2=-1
_.aN=_.y2=0
_.dc=_.by=_.da=_.I=_.a6=_.H=null
_.bz=b
_.bA=_.at=!1
_.ec=null},
e8:function e8(a){this.a=a},
ei:function ei(a){this.a=a},
eb:function eb(a){this.a=a},
e9:function e9(a){this.a=a},
ek:function ek(a){this.a=a},
ee:function ee(a,b,c){this.a=a
this.b=b
this.c=c},
ed:function ed(a){this.a=a},
ea:function ea(a,b,c){this.a=a
this.b=b
this.c=c},
eh:function eh(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
ec:function ec(a){this.a=a},
el:function el(a){this.a=a},
ej:function ej(a,b){this.a=a
this.b=b},
ef:function ef(a){this.a=a},
eg:function eg(a,b){this.a=a
this.b=b},
bz:function(a,b){a=a+b&536870911
a=a+((a&524287)<<10)&536870911
return a^a>>>6},
hZ:function(a){a=a+((a&67108863)<<3)&536870911
a^=a>>>11
return a+((a&16383)<<15)&536870911}},E={
K:function(a){var s=new E.cI(a)
s.b="FlashError"
return s},
cI:function cI(a){this.a=a
this.b=null},
jN:function(a){switch(a){case 0:return C.G
case 1:return C.E
case 2:return C.F
case 3:return C.q
case 4:return C.j
case 5:return C.n
case 6:return C.l
case 7:return C.H
case 8:return C.r
case 9:return C.t
default:return null}},
V:function V(a,b){this.a=a
this.b=b}},G={
jf:function(a){var s,r,q
try{s=C.y.d3(0,a)
r=new G.cp()
r.b9(0,9999)
r.a=J.aX(s.n(0,"toLevel"))
r.b=J.aX(s.n(0,"fromLevel"))
r.c=J.aX(s.n(0,"streamLength"))
r.d=s.n(0,"imageID")
return r}catch(q){H.n(q)}return null},
cp:function cp(){var _=this
_.a=0
_.b=9999
_.c=0
_.d=null}},Z={
k2:function(){return new Z.eT()},
eT:function eT(){this.c=this.b=this.a=null}}
var w=[C,H,J,P,W,B,K,Y,S,L,Q,U,M,N,T,F,A,R,V,D,O,E,G,Z]
hunkHelpers.setFunctionNamesIfNecessary(w)
var $={}
H.fY.prototype={}
J.L.prototype={
J:function(a,b){return a===b},
gv:function(a){return H.bO(a)},
h:function(a){return"Instance of '"+H.d(H.eM(a))+"'"},
au:function(a,b){throw H.a(P.i4(a,b.gbF(),b.gbK(),b.gbG()))}}
J.ev.prototype={
h:function(a){return String(a)},
gv:function(a){return a?519018:218159}}
J.b4.prototype={
J:function(a,b){return null==b},
h:function(a){return"null"},
gv:function(a){return 0},
au:function(a,b){return this.cj(a,b)},
$iG:1}
J.an.prototype={
gv:function(a){return 0},
h:function(a){return String(a)},
$ihY:1}
J.d3.prototype={}
J.ar.prototype={}
J.a4.prototype={
h:function(a){var s=a[$.fR()]
if(s==null)return this.cl(a)
return"JavaScript function for "+H.d(J.az(s))},
$ib2:1}
J.r.prototype={
aK:function(a,b){if(!!a.fixed$length)H.t(P.aP("add"))
a.push(b)},
aL:function(a,b){var s
if(!!a.fixed$length)H.t(P.aP("addAll"))
if(Array.isArray(b)){this.cA(a,b)
return}for(s=J.ce(b);s.B();)a.push(s.gC())},
cA:function(a,b){var s,r=b.length
if(r===0)return
if(a===b)throw H.a(P.aC(a))
for(s=0;s<r;++s)a.push(b[s])},
F:function(a,b){var s,r=a.length
for(s=0;s<r;++s){b.$1(a[s])
if(a.length!==r)throw H.a(P.aC(a))}},
bE:function(a,b,c){return new H.ah(a,b,H.ha(a).p("@<1>").X(c).p("ah<1,2>"))},
M:function(a,b){return a[b]},
gdd:function(a){if(a.length>0)return a[0]
throw H.a(H.jC())},
ad:function(a,b,c,d){var s
if(!!a.immutable$list)H.t(P.aP("fill range"))
P.h4(b,c,a.length)
for(s=b;s<c;++s)a[s]=d},
gbD:function(a){return a.length!==0},
h:function(a){return P.hV(a,"[","]")},
gN:function(a){return new J.bj(a,a.length)},
gv:function(a){return H.bO(a)},
gl:function(a){return a.length},
sl:function(a,b){if(!!a.fixed$length)H.t(P.aP("set length"))
if(b<0)throw H.a(P.ap(b,0,null,"newLength",null))
a.length=b},
n:function(a,b){if(b>=a.length||b<0)throw H.a(H.aS(a,b))
return a[b]},
q:function(a,b,c){if(!!a.immutable$list)H.t(P.aP("indexed set"))
if(!H.aQ(b))throw H.a(H.aS(a,b))
if(b>=a.length||b<0)throw H.a(H.aS(a,b))
a[b]=c},
$iB:1}
J.ex.prototype={}
J.bj.prototype={
gC:function(){return this.d},
B:function(){var s,r=this,q=r.a,p=q.length
if(r.b!==p)throw H.a(H.ay(q))
s=r.c
if(s>=p){r.d=null
return!1}r.d=q[s]
r.c=s+1
return!0}}
J.aF.prototype={
k:function(a){var s
if(a>=-2147483648&&a<=2147483647)return a|0
if(isFinite(a)){s=a<0?Math.ceil(a):Math.floor(a)
return s+0}throw H.a(P.aP(""+a+".toInt()"))},
E:function(a){var s,r
if(a>=0){if(a<=2147483647)return a|0}else if(a>=-2147483648){s=a|0
return a===s?s:s-1}r=Math.floor(a)
if(isFinite(r))return r
throw H.a(P.aP(""+a+".floor()"))},
h:function(a){if(a===0&&1/a<0)return"-0.0"
else return""+a},
gv:function(a){var s,r,q,p,o=a|0
if(a===o)return o&536870911
s=Math.abs(a)
r=Math.log(s)/0.6931471805599453|0
q=Math.pow(2,r)
p=s<1?s/q:q/s
return((p*9007199254740992|0)+(p*3542243181176521|0))*599197+r*1259&536870911},
b3:function(a,b){var s=a%b
if(s===0)return 0
if(s>0)return s
if(b<0)return s-b
else return s+b},
cb:function(a,b){if(b<0)throw H.a(H.fA(b))
return b>31?0:a<<b>>>0},
bn:function(a,b){return b>31?0:a<<b>>>0},
aj:function(a,b){var s
if(b<0)throw H.a(H.fA(b))
if(a>0)s=this.bo(a,b)
else{s=b>31?31:b
s=a>>s>>>0}return s},
L:function(a,b){var s
if(a>0)s=this.bo(a,b)
else{s=b>31?31:b
s=a>>s>>>0}return s},
bo:function(a,b){return b>31?0:a>>>b},
$ia6:1,
$iY:1}
J.by.prototype={$ij:1}
J.cN.prototype={}
J.am.prototype={
cZ:function(a,b){if(b<0)throw H.a(H.aS(a,b))
if(b>=a.length)H.t(H.aS(a,b))
return a.charCodeAt(b)},
bh:function(a,b){if(b>=a.length)throw H.a(H.aS(a,b))
return a.charCodeAt(b)},
S:function(a,b){if(typeof b!="string")throw H.a(P.fT(b,null,null))
return a+b},
cc:function(a,b){var s=b.length
if(s>a.length)return!1
return b===a.substring(0,s)},
a4:function(a,b,c){if(c==null)c=a.length
if(b<0)throw H.a(P.eN(b,null))
if(b>c)throw H.a(P.eN(b,null))
if(c>a.length)throw H.a(P.eN(c,null))
return a.substring(b,c)},
cd:function(a,b){return this.a4(a,b,null)},
dw:function(a,b){var s=a.length,r=b.length
if(s+r>s)s-=r
return a.lastIndexOf(b,s)},
h:function(a){return a},
gv:function(a){var s,r,q
for(s=a.length,r=0,q=0;q<s;++q){r=r+a.charCodeAt(q)&536870911
r=r+((r&524287)<<10)&536870911
r^=r>>6}r=r+((r&67108863)<<3)&536870911
r^=r>>11
return r+((r&16383)<<15)&536870911},
gl:function(a){return a.length},
n:function(a,b){if(b.ea(0,a.length)||b.eb(0,0))throw H.a(H.aS(a,b))
return a[b]},
$iH:1}
H.cQ.prototype={
h:function(a){var s=this.a
return s!=null?"LateInitializationError: "+s:"LateInitializationError"}}
H.bL.prototype={
h:function(a){return"Null is not a valid value for the parameter '"+this.a+"' of type '"+H.hm(this.$ti.c).h(0)+"'"}}
H.bs.prototype={}
H.aJ.prototype={
gN:function(a){return new H.bD(this,this.gl(this))},
gU:function(a){return this.gl(this)===0}}
H.bT.prototype={
gcK:function(){var s=J.aW(this.a)
return s},
gcR:function(){var s=J.aW(this.a),r=this.b
if(r>s)return s
return r},
gl:function(a){var s=J.aW(this.a),r=this.b
if(r>=s)return 0
return s-r},
M:function(a,b){var s=this,r=s.gcR()+b
if(b<0||r>=s.gcK())throw H.a(P.fX(b,s,"index",null,null))
return J.hA(s.a,r)},
e3:function(a,b){var s,r,q,p=this,o=p.b,n=p.a,m=J.av(n),l=m.gl(n)
p.c
s=l-o
if(s<=0){n=J.hW(0,p.$ti.c)
return n}r=P.h_(s,m.M(n,o),!1,p.$ti.c)
for(q=1;q<s;++q){r[q]=m.M(n,o+q)
if(m.gl(n)<l)throw H.a(P.aC(p))}return r}}
H.bD.prototype={
gC:function(){return this.d},
B:function(){var s,r=this,q=r.a,p=J.av(q),o=p.gl(q)
if(r.b!==o)throw H.a(P.aC(q))
s=r.c
if(s>=o){r.d=null
return!1}r.d=p.M(q,s);++r.c
return!0}}
H.ah.prototype={
gl:function(a){return J.aW(this.a)},
M:function(a,b){return this.b.$1(J.hA(this.a,b))}}
H.bt.prototype={}
H.b9.prototype={
gv:function(a){var s=this._hashCode
if(s!=null)return s
s=664597*J.cd(this.a)&536870911
this._hashCode=s
return s},
h:function(a){return'Symbol("'+H.d(this.a)+'")'},
J:function(a,b){if(b==null)return!1
return b instanceof H.b9&&this.a==b.a},
$iba:1}
H.bp.prototype={}
H.bo.prototype={
gU:function(a){return this.gl(this)===0},
h:function(a){return P.eF(this)},
$ia_:1}
H.bq.prototype={
gl:function(a){return this.a},
aq:function(a){if("__proto__"===a)return!1
return this.b.hasOwnProperty(a)},
n:function(a,b){if(!this.aq(b))return null
return this.bj(b)},
bj:function(a){return this.b[a]},
F:function(a,b){var s,r,q,p=this.c
for(s=p.length,r=0;r<s;++r){q=p[r]
b.$2(q,this.bj(q))}}}
H.ew.prototype={
gbF:function(){var s=this.a
return s},
gbK:function(){var s,r,q,p,o=this
if(o.c===1)return C.C
s=o.d
r=s.length-o.e.length-o.f
if(r===0)return C.C
q=[]
for(p=0;p<r;++p)q.push(s[p])
q.fixed$length=Array
q.immutable$list=Array
return q},
gbG:function(){var s,r,q,p,o,n,m=this
if(m.c!==0)return C.D
s=m.e
r=s.length
q=m.d
p=q.length-r-m.f
if(r===0)return C.D
o=new H.y(t.B)
for(n=0;n<r;++n)o.q(0,new H.b9(s[n]),q[p+n])
return new H.bp(o,t.a)}}
H.eL.prototype={
$2:function(a,b){var s=this.a
s.b=s.b+"$"+H.d(a)
this.b.push(a)
this.c.push(b);++s.a},
$S:10}
H.eQ.prototype={
O:function(a){var s,r,q=this,p=new RegExp(q.a).exec(a)
if(p==null)return null
s=Object.create(null)
r=q.b
if(r!==-1)s.arguments=p[r+1]
r=q.c
if(r!==-1)s.argumentsExpr=p[r+1]
r=q.d
if(r!==-1)s.expr=p[r+1]
r=q.e
if(r!==-1)s.method=p[r+1]
r=q.f
if(r!==-1)s.receiver=p[r+1]
return s}}
H.bM.prototype={
h:function(a){var s=this.b
if(s==null)return"NoSuchMethodError: "+H.d(this.a)
return"NoSuchMethodError: method not found: '"+s+"' on null"}}
H.cO.prototype={
h:function(a){var s,r=this,q="NoSuchMethodError: method not found: '",p=r.b
if(p==null)return"NoSuchMethodError: "+H.d(r.a)
s=r.c
if(s==null)return q+p+"' ("+H.d(r.a)+")"
return q+p+"' on '"+s+"' ("+H.d(r.a)+")"}}
H.de.prototype={
h:function(a){var s=this.a
return s.length===0?"Error":"Error: "+s}}
H.eK.prototype={
h:function(a){return"Throw of null ('"+(this.a===null?"null":"undefined")+"' from JavaScript)"}}
H.c0.prototype={
h:function(a){var s,r=this.b
if(r!=null)return r
r=this.a
s=r!==null&&typeof r==="object"?r.stack:null
return this.b=s==null?"":s},
$ibR:1}
H.aB.prototype={
h:function(a){var s=this.constructor,r=s==null?null:s.name
return"Closure '"+H.iJ(r==null?"unknown":r)+"'"},
$ib2:1,
ge9:function(){return this},
$C:"$1",
$R:1,
$D:null}
H.da.prototype={}
H.d8.prototype={
h:function(a){var s=this.$static_name
if(s==null)return"Closure of unknown static method"
return"Closure '"+H.iJ(s)+"'"}}
H.aY.prototype={
J:function(a,b){var s=this
if(b==null)return!1
if(s===b)return!0
if(!(b instanceof H.aY))return!1
return s.a===b.a&&s.b===b.b&&s.c===b.c},
gv:function(a){var s,r=this.c
if(r==null)s=H.bO(this.a)
else s=typeof r!=="object"?J.cd(r):H.bO(r)
return(s^H.bO(this.b))>>>0},
h:function(a){var s=this.c
if(s==null)s=this.a
return"Closure '"+H.d(this.d)+"' of "+("Instance of '"+H.d(H.eM(s))+"'")}}
H.d5.prototype={
h:function(a){return"RuntimeError: "+this.a},
gW:function(a){return this.a}}
H.fj.prototype={}
H.y.prototype={
gl:function(a){return this.a},
gU:function(a){return this.a===0},
ga9:function(){return new H.aI(this,H.is(this).p("aI<1>"))},
aq:function(a){var s,r
if(typeof a=="string"){s=this.b
if(s==null)return!1
return this.cI(s,a)}else{r=this.dt(a)
return r}},
dt:function(a){var s=this.d
if(s==null)return!1
return this.aP(this.aF(s,J.cd(a)&0x3ffffff),a)>=0},
n:function(a,b){var s,r,q,p,o=this,n=null
if(typeof b=="string"){s=o.b
if(s==null)return n
r=o.ao(s,b)
q=r==null?n:r.b
return q}else if(typeof b=="number"&&(b&0x3ffffff)===b){p=o.c
if(p==null)return n
r=o.ao(p,b)
q=r==null?n:r.b
return q}else return o.du(b)},
du:function(a){var s,r,q=this.d
if(q==null)return null
s=this.aF(q,J.cd(a)&0x3ffffff)
r=this.aP(s,a)
if(r<0)return null
return s[r].b},
q:function(a,b,c){var s,r,q,p,o,n,m=this
if(typeof b=="string"){s=m.b
m.bb(s==null?m.b=m.aG():s,b,c)}else if(typeof b=="number"&&(b&0x3ffffff)===b){r=m.c
m.bb(r==null?m.c=m.aG():r,b,c)}else{q=m.d
if(q==null)q=m.d=m.aG()
p=J.cd(b)&0x3ffffff
o=m.aF(q,p)
if(o==null)m.aJ(q,p,[m.aH(b,c)])
else{n=m.aP(o,b)
if(n>=0)o[n].b=c
else o.push(m.aH(b,c))}}},
dG:function(a,b){var s
if(this.aq(a))return this.n(0,a)
s=b.$0()
this.q(0,a,s)
return s},
F:function(a,b){var s=this,r=s.e,q=s.r
for(;r!=null;){b.$2(r.a,r.b)
if(q!==s.r)throw H.a(P.aC(s))
r=r.c}},
bb:function(a,b,c){var s=this.ao(a,b)
if(s==null)this.aJ(a,b,this.aH(b,c))
else s.b=c},
aH:function(a,b){var s=this,r=new H.eC(a,b)
if(s.e==null)s.e=s.f=r
else s.f=s.f.c=r;++s.a
s.r=s.r+1&67108863
return r},
aP:function(a,b){var s,r
if(a==null)return-1
s=a.length
for(r=0;r<s;++r)if(J.k(a[r].a,b))return r
return-1},
h:function(a){return P.eF(this)},
ao:function(a,b){return a[b]},
aF:function(a,b){return a[b]},
aJ:function(a,b,c){a[b]=c},
cJ:function(a,b){delete a[b]},
cI:function(a,b){return this.ao(a,b)!=null},
aG:function(){var s="<non-identifier-key>",r=Object.create(null)
this.aJ(r,s,r)
this.cJ(r,s)
return r}}
H.eC.prototype={}
H.aI.prototype={
gl:function(a){return this.a.a},
gU:function(a){return this.a.a===0},
gN:function(a){var s=this.a,r=new H.cR(s,s.r)
r.c=s.e
return r}}
H.cR.prototype={
gC:function(){return this.d},
B:function(){var s,r=this,q=r.a
if(r.b!==q.r)throw H.a(P.aC(q))
s=r.c
if(s==null){r.d=null
return!1}else{r.d=s.a
r.c=s.c
return!0}}}
H.fC.prototype={
$1:function(a){return this.a(a)},
$S:3}
H.fD.prototype={
$2:function(a,b){return this.a(a,b)},
$S:11}
H.fE.prototype={
$1:function(a){return this.a(a)},
$S:12}
H.bI.prototype={$ibI:1}
H.z.prototype={
cM:function(a,b,c,d){if(!H.aQ(b))throw H.a(P.fT(b,d,"Invalid list position"))
else throw H.a(P.ap(b,0,c,d,null))},
bf:function(a,b,c,d){if(b>>>0!==b||b>c)this.cM(a,b,c,d)},
$iz:1,
$iW:1}
H.b6.prototype={
gl:function(a){return a.length},
$iZ:1}
H.aM.prototype={
n:function(a,b){H.aj(b,a,a.length)
return a[b]},
q:function(a,b,c){H.aj(b,a,a.length)
a[b]=c},
$iB:1}
H.R.prototype={
q:function(a,b,c){H.aj(b,a,a.length)
a[b]=c},
ab:function(a,b,c,d,e){var s,r,q,p
if(t.cu.b(d)){s=a.length
this.bf(a,b,s,"start")
this.bf(a,c,s,"end")
if(b>c)H.t(P.ap(b,0,c,null,null))
r=c-b
if(e<0)H.t(P.x(e))
q=d.length
if(q-e<r)H.t(P.d7("Not enough elements"))
p=e!==0||q!==r?d.subarray(e,e+r):d
a.set(p,b)
return}this.co(a,b,c,d,e)},
b8:function(a,b,c,d){return this.ab(a,b,c,d,0)},
$iB:1}
H.cW.prototype={
n:function(a,b){H.aj(b,a,a.length)
return a[b]}}
H.cX.prototype={
n:function(a,b){H.aj(b,a,a.length)
return a[b]}}
H.cY.prototype={
n:function(a,b){H.aj(b,a,a.length)
return a[b]}}
H.cZ.prototype={
n:function(a,b){H.aj(b,a,a.length)
return a[b]}}
H.d_.prototype={
n:function(a,b){H.aj(b,a,a.length)
return a[b]}}
H.bJ.prototype={
gl:function(a){return a.length},
n:function(a,b){H.aj(b,a,a.length)
return a[b]}}
H.bK.prototype={
gl:function(a){return a.length},
n:function(a,b){H.aj(b,a,a.length)
return a[b]}}
H.bX.prototype={}
H.bY.prototype={}
H.bZ.prototype={}
H.c_.prototype={}
H.a0.prototype={
p:function(a){return H.ds(v.typeUniverse,this,a)},
X:function(a){return H.kp(v.typeUniverse,this,a)}}
H.dj.prototype={}
H.dq.prototype={
h:function(a){return H.T(this.a,null)}}
H.di.prototype={
h:function(a){return this.a}}
H.c1.prototype={
gW:function(a){return this.a}}
P.f_.prototype={
$1:function(a){var s=this.a,r=s.a
s.a=null
r.$0()},
$S:4}
P.eZ.prototype={
$1:function(a){var s,r
this.a.a=a
s=this.b
r=this.c
s.firstChild?s.removeChild(r):s.appendChild(r)},
$S:13}
P.f0.prototype={
$0:function(){this.a.$0()},
$C:"$0",
$R:0,
$S:7}
P.f1.prototype={
$0:function(){this.a.$0()},
$C:"$0",
$R:0,
$S:7}
P.fp.prototype={
cz:function(a,b){if(self.setTimeout!=null)self.setTimeout(H.bg(new P.fq(this,b),0),a)
else throw H.a(P.aP("`setTimeout()` not found."))}}
P.fq.prototype={
$0:function(){this.b.$0()},
$C:"$0",
$R:0,
$S:1}
P.cm.prototype={
h:function(a){return H.d(this.a)},
$il:1,
gak:function(){return this.b}}
P.dh.prototype={
bv:function(a){var s,r
H.hk(a,"error",t.K)
s=this.a
if(s.a!==0)throw H.a(P.d7("Future already completed"))
r=P.hB(a)
s.cD(a,r)}}
P.bV.prototype={}
P.dk.prototype={
dz:function(a){if((this.c&15)!==6)return!0
return this.b.b.aU(this.d,a.a)},
dj:function(a){var s=this.e,r=this.b.b
if(t.R.b(s))return r.dZ(s,a.a,a.b)
else return r.aU(s,a.a)}}
P.a1.prototype={
bO:function(a,b,c){var s,r,q=$.D
if(q!==C.i)b=b!=null?P.kM(b,q):b
s=new P.a1(q,c.p("a1<0>"))
r=b==null?1:3
this.bc(new P.dk(s,r,a,b,this.$ti.p("@<1>").X(c).p("dk<1,2>")))
return s},
e2:function(a,b){return this.bO(a,null,b)},
bc:function(a){var s,r=this,q=r.a
if(q<=1){a.a=r.c
r.c=a}else{if(q===2){q=r.c
s=q.a
if(s<4){q.bc(a)
return}r.a=s
r.c=q.c}P.be(null,null,r.b,new P.f3(r,a))}},
bm:function(a){var s,r,q,p,o,n,m=this,l={}
l.a=a
if(a==null)return
s=m.a
if(s<=1){r=m.c
m.c=a
if(r!=null){q=a.a
for(p=a;q!=null;p=q,q=o)o=q.a
p.a=r}}else{if(s===2){s=m.c
n=s.a
if(n<4){s.bm(a)
return}m.a=n
m.c=s.c}l.a=m.ap(a)
P.be(null,null,m.b,new P.fa(l,m))}},
aI:function(){var s=this.c
this.c=null
return this.ap(s)},
ap:function(a){var s,r,q
for(s=a,r=null;s!=null;r=s,s=q){q=s.a
s.a=r}return r},
bd:function(a){var s,r,q,p=this
p.a=1
try{a.bO(new P.f6(p),new P.f7(p),t.P)}catch(q){s=H.n(q)
r=H.aw(q)
P.lj(new P.f8(p,s,r))}},
bi:function(a){var s=this,r=s.aI()
s.a=4
s.c=a
P.bW(s,r)},
am:function(a,b){var s=this,r=s.aI(),q=P.dL(a,b)
s.a=8
s.c=q
P.bW(s,r)},
cC:function(a){if(this.$ti.p("b3<1>").b(a)){this.cH(a)
return}this.cE(a)},
cE:function(a){this.a=1
P.be(null,null,this.b,new P.f5(this,a))},
cH:function(a){var s=this
if(s.$ti.b(a)){if(a.a===8){s.a=1
P.be(null,null,s.b,new P.f9(s,a))}else P.h5(a,s)
return}s.bd(a)},
cD:function(a,b){this.a=1
P.be(null,null,this.b,new P.f4(this,a,b))},
$ib3:1}
P.f3.prototype={
$0:function(){P.bW(this.a,this.b)},
$S:1}
P.fa.prototype={
$0:function(){P.bW(this.b,this.a.a)},
$S:1}
P.f6.prototype={
$1:function(a){var s,r,q,p=this.a
p.a=0
try{p.bi(p.$ti.c.a(a))}catch(q){s=H.n(q)
r=H.aw(q)
p.am(s,r)}},
$S:4}
P.f7.prototype={
$2:function(a,b){this.a.am(a,b)},
$C:"$2",
$R:2,
$S:14}
P.f8.prototype={
$0:function(){this.a.am(this.b,this.c)},
$S:1}
P.f5.prototype={
$0:function(){this.a.bi(this.b)},
$S:1}
P.f9.prototype={
$0:function(){P.h5(this.b,this.a)},
$S:1}
P.f4.prototype={
$0:function(){this.a.am(this.b,this.c)},
$S:1}
P.fd.prototype={
$0:function(){var s,r,q,p,o,n,m=this,l=null
try{q=m.a.a
l=q.b.b.dX(q.d)}catch(p){s=H.n(p)
r=H.aw(p)
if(m.c){q=m.b.a.c.a
o=s
o=q==null?o==null:q===o
q=o}else q=!1
o=m.a
if(q)o.c=m.b.a.c
else o.c=P.dL(s,r)
o.b=!0
return}if(l instanceof P.a1&&l.a>=4){if(l.a===8){q=m.a
q.c=l.c
q.b=!0}return}if(t.c.b(l)){n=m.b.a
q=m.a
q.c=l.e2(new P.fe(n),t.z)
q.b=!1}},
$S:1}
P.fe.prototype={
$1:function(a){return this.a},
$S:15}
P.fc.prototype={
$0:function(){var s,r,q,p,o
try{q=this.a
p=q.a
q.c=p.b.b.aU(p.d,this.b)}catch(o){s=H.n(o)
r=H.aw(o)
q=this.a
q.c=P.dL(s,r)
q.b=!0}},
$S:1}
P.fb.prototype={
$0:function(){var s,r,q,p,o,n,m,l,k=this
try{s=k.a.a.c
p=k.b
if(p.a.dz(s)&&p.a.e!=null){p.c=p.a.dj(s)
p.b=!1}}catch(o){r=H.n(o)
q=H.aw(o)
p=k.a.a.c
n=p.a
m=r
l=k.b
if(n==null?m==null:n===m)l.c=p
else l.c=P.dL(r,q)
l.b=!0}},
$S:1}
P.dg.prototype={}
P.d9.prototype={}
P.fs.prototype={}
P.fw.prototype={
$0:function(){var s=H.a(this.a)
s.stack=J.az(this.b)
throw s},
$S:1}
P.fk.prototype={
e0:function(a){var s,r,q,p=null
try{if(C.i===$.D){a.$0()
return}P.iu(p,p,this,a)}catch(q){s=H.n(q)
r=H.aw(q)
P.hj(p,p,this,s,r)}},
br:function(a){return new P.fl(this,a)},
n:function(a,b){return null},
dY:function(a){if($.D===C.i)return a.$0()
return P.iu(null,null,this,a)},
dX:function(a){return this.dY(a,t.z)},
e1:function(a,b){if($.D===C.i)return a.$1(b)
return P.kO(null,null,this,a,b)},
aU:function(a,b){return this.e1(a,b,t.z,t.z)},
e_:function(a,b,c){if($.D===C.i)return a.$2(b,c)
return P.kN(null,null,this,a,b,c)},
dZ:function(a,b,c){return this.e_(a,b,c,t.z,t.z,t.z)}}
P.fl.prototype={
$0:function(){return this.a.e0(this.b)},
$S:1}
P.q.prototype={
gN:function(a){return new H.bD(a,this.gl(a))},
M:function(a,b){return this.n(a,b)},
gbD:function(a){return this.gl(a)!==0},
bE:function(a,b,c){return new H.ah(a,b,H.ax(a).p("@<q.E>").X(c).p("ah<1,2>"))},
ad:function(a,b,c,d){var s
P.h4(b,c,this.gl(a))
for(s=b;s<c;++s)this.q(a,s,d)},
ab:function(a,b,c,d,e){var s,r,q,p
P.h4(b,c,this.gl(a))
s=c-b
if(s===0)return
P.h3(e,"skipCount")
if(H.ax(a).p("B<q.E>").b(d)){r=e
q=d}else{d.toString
q=H.k0(d,e,null,H.ax(d).p("q.E")).e3(0,!1)
r=0}if(r+s>q.length)throw H.a(P.d7("Too few elements"))
if(r<b)for(p=s-1;p>=0;--p)this.q(a,b+p,q[r+p])
else for(p=0;p<s;++p)this.q(a,b+p,q[r+p])},
h:function(a){return P.hV(a,"[","]")}}
P.bE.prototype={}
P.eG.prototype={
$2:function(a,b){var s,r=this.a
if(!r.a)this.b.a+=", "
r.a=!1
r=this.b
s=r.a+=H.d(a)
r.a=s+": "
r.a+=H.d(b)},
$S:8}
P.aL.prototype={
F:function(a,b){var s,r
for(s=this.ga9(),s=s.gN(s);s.B();){r=s.gC()
b.$2(r,this.n(0,r))}},
gl:function(a){var s=this.ga9()
return s.gl(s)},
gU:function(a){var s=this.ga9()
return s.gU(s)},
h:function(a){return P.eF(this)},
$ia_:1}
P.dt.prototype={}
P.bF.prototype={
n:function(a,b){return this.a.n(0,b)},
F:function(a,b){this.a.F(0,b)},
gU:function(a){return this.a.a===0},
gl:function(a){return this.a.a},
h:function(a){return P.eF(this.a)},
$ia_:1}
P.bU.prototype={}
P.c4.prototype={}
P.dl.prototype={
n:function(a,b){var s,r=this.b
if(r==null)return this.c.n(0,b)
else if(typeof b!="string")return null
else{s=r[b]
return typeof s=="undefined"?this.cN(b):s}},
gl:function(a){return this.b==null?this.c.a:this.an().length},
gU:function(a){return this.gl(this)===0},
ga9:function(){if(this.b==null){var s=this.c
return new H.aI(s,H.is(s).p("aI<1>"))}return new P.dm(this)},
F:function(a,b){var s,r,q,p,o=this
if(o.b==null)return o.c.F(0,b)
s=o.an()
for(r=0;r<s.length;++r){q=s[r]
p=o.b[q]
if(typeof p=="undefined"){p=P.ft(o.a[q])
o.b[q]=p}b.$2(q,p)
if(s!==o.c)throw H.a(P.aC(o))}},
an:function(){var s=this.c
if(s==null)s=this.c=H.f(Object.keys(this.a),t.s)
return s},
cN:function(a){var s
if(!Object.prototype.hasOwnProperty.call(this.a,a))return null
s=P.ft(this.a[a])
return this.b[a]=s}}
P.dm.prototype={
gl:function(a){var s=this.a
return s.gl(s)},
M:function(a,b){var s=this.a
return s.b==null?s.ga9().M(0,b):s.an()[b]},
gN:function(a){var s=this.a
if(s.b==null){s=s.ga9()
s=s.gN(s)}else{s=s.an()
s=new J.bj(s,s.length)}return s}}
P.cq.prototype={}
P.cw.prototype={}
P.bB.prototype={
h:function(a){var s=P.ac(this.a)
return(this.b!=null?"Converting object to an encodable object failed:":"Converting object did not return an encodable object:")+" "+s}}
P.cP.prototype={
h:function(a){return"Cyclic error in JSON stringify"}}
P.ey.prototype={
d3:function(a,b){var s=P.kL(b,this.gd4().a)
return s},
d7:function(a){var s=P.ka(a,this.gd8().b,null)
return s},
gd8:function(){return C.W},
gd4:function(){return C.V}}
P.eA.prototype={}
P.ez.prototype={}
P.fh.prototype={
bT:function(a){var s,r,q,p,o,n,m,l=a.length
for(s=J.l3(a),r=this.c,q=0,p=0;p<l;++p){o=s.bh(a,p)
if(o>92){if(o>=55296){n=o&64512
if(n===55296){m=p+1
m=!(m<l&&(C.e.bh(a,m)&64512)===56320)}else m=!1
if(!m)if(n===56320){n=p-1
n=!(n>=0&&(C.e.cZ(a,n)&64512)===55296)}else n=!1
else n=!0
if(n){if(p>q)r.a+=C.e.a4(a,q,p)
q=p+1
r.a+=H.C(92)
r.a+=H.C(117)
r.a+=H.C(100)
n=o>>>8&15
r.a+=H.C(n<10?48+n:87+n)
n=o>>>4&15
r.a+=H.C(n<10?48+n:87+n)
n=o&15
r.a+=H.C(n<10?48+n:87+n)}}continue}if(o<32){if(p>q)r.a+=C.e.a4(a,q,p)
q=p+1
r.a+=H.C(92)
switch(o){case 8:r.a+=H.C(98)
break
case 9:r.a+=H.C(116)
break
case 10:r.a+=H.C(110)
break
case 12:r.a+=H.C(102)
break
case 13:r.a+=H.C(114)
break
default:r.a+=H.C(117)
r.a+=H.C(48)
r.a+=H.C(48)
n=o>>>4&15
r.a+=H.C(n<10?48+n:87+n)
n=o&15
r.a+=H.C(n<10?48+n:87+n)
break}}else if(o===34||o===92){if(p>q)r.a+=C.e.a4(a,q,p)
q=p+1
r.a+=H.C(92)
r.a+=H.C(o)}}if(q===0)r.a+=H.d(a)
else if(q<l)r.a+=s.a4(a,q,l)},
aB:function(a){var s,r,q,p
for(s=this.a,r=s.length,q=0;q<r;++q){p=s[q]
if(a==null?p==null:a===p)throw H.a(new P.cP(a,null))}s.push(a)},
ax:function(a){var s,r,q,p,o=this
if(o.bS(a))return
o.aB(a)
try{s=o.b.$1(a)
if(!o.bS(s)){q=P.i_(a,null,o.gbl())
throw H.a(q)}o.a.pop()}catch(p){r=H.n(p)
q=P.i_(a,r,o.gbl())
throw H.a(q)}},
bS:function(a){var s,r,q=this
if(typeof a=="number"){if(!isFinite(a))return!1
q.c.a+=C.a.h(a)
return!0}else if(a===!0){q.c.a+="true"
return!0}else if(a===!1){q.c.a+="false"
return!0}else if(a==null){q.c.a+="null"
return!0}else if(typeof a=="string"){s=q.c
s.a+='"'
q.bT(a)
s.a+='"'
return!0}else if(t.j.b(a)){q.aB(a)
q.e6(a)
q.a.pop()
return!0}else if(t.f.b(a)){q.aB(a)
r=q.e7(a)
q.a.pop()
return r}else return!1},
e6:function(a){var s,r,q=this.c
q.a+="["
s=J.av(a)
if(s.gbD(a)){this.ax(s.n(a,0))
for(r=1;r<s.gl(a);++r){q.a+=","
this.ax(s.n(a,r))}}q.a+="]"},
e7:function(a){var s,r,q,p,o,n=this,m={}
if(a.gU(a)){n.c.a+="{}"
return!0}s=a.gl(a)*2
r=P.h_(s,null,!1,t.Q)
q=m.a=0
m.b=!0
a.F(0,new P.fi(m,r))
if(!m.b)return!1
p=n.c
p.a+="{"
for(o='"';q<s;q+=2,o=',"'){p.a+=o
n.bT(H.ks(r[q]))
p.a+='":'
n.ax(r[q+1])}p.a+="}"
return!0}}
P.fi.prototype={
$2:function(a,b){var s,r,q,p
if(typeof a!="string")this.a.b=!1
s=this.b
r=this.a
q=r.a
p=r.a=q+1
s[q]=a
r.a=p+1
s[p]=b},
$S:8}
P.fg.prototype={
gbl:function(){var s=this.c.a
return s.charCodeAt(0)==0?s:s}}
P.eI.prototype={
$2:function(a,b){var s,r=this.b,q=this.a
r.a+=q.a
s=r.a+=H.d(a.a)
r.a=s+": "
r.a+=P.ac(b)
q.a=", "},
$S:16}
P.b_.prototype={
J:function(a,b){if(b==null)return!1
return b instanceof P.b_&&this.a===b.a&&this.b===b.b},
gv:function(a){var s=this.a
return(s^C.c.L(s,30))&1073741823},
h:function(a){var s=this,r=P.jt(H.jX(s)),q=P.cA(H.jV(s)),p=P.cA(H.jR(s)),o=P.cA(H.jS(s)),n=P.cA(H.jU(s)),m=P.cA(H.jW(s)),l=P.ju(H.jT(s))
if(s.b)return r+"-"+q+"-"+p+" "+o+":"+n+":"+m+"."+l+"Z"
else return r+"-"+q+"-"+p+" "+o+":"+n+":"+m+"."+l}}
P.l.prototype={
gak:function(){return H.aw(this.$thrownJsError)}}
P.cl.prototype={
h:function(a){var s=this.a
if(s!=null)return"Assertion failed: "+P.ac(s)
return"Assertion failed"},
gW:function(a){return this.a}}
P.dc.prototype={}
P.d1.prototype={
h:function(a){return"Throw of null."}}
P.a7.prototype={
gaE:function(){return"Invalid argument"+(!this.a?"(s)":"")},
gaD:function(){return""},
h:function(a){var s,r,q=this,p=q.c,o=p==null?"":" ("+p+")",n=q.d,m=n==null?"":": "+H.d(n),l=q.gaE()+o+m
if(!q.a)return l
s=q.gaD()
r=P.ac(q.b)
return l+s+": "+r},
gae:function(a){return this.c},
gW:function(a){return this.d}}
P.b8.prototype={
gaE:function(){return"RangeError"},
gaD:function(){var s,r=this.e,q=this.f
if(r==null)s=q!=null?": Not less than or equal to "+H.d(q):""
else if(q==null)s=": Not greater than or equal to "+H.d(r)
else if(q>r)s=": Not in inclusive range "+H.d(r)+".."+H.d(q)
else s=q<r?": Valid value range is empty":": Only valid value is "+H.d(r)
return s}}
P.cM.prototype={
gaE:function(){return"RangeError"},
gaD:function(){if(this.b<0)return": index must not be negative"
var s=this.f
if(s===0)return": no indices are valid"
return": index should be less than "+H.d(s)},
gl:function(a){return this.f}}
P.d0.prototype={
h:function(a){var s,r,q,p,o,n,m,l,k=this,j={},i=new P.aq("")
j.a=""
s=k.c
for(r=s.length,q=0,p="",o="";q<r;++q,o=", "){n=s[q]
i.a=p+o
p=i.a+=P.ac(n)
j.a=", "}k.d.F(0,new P.eI(j,i))
m=P.ac(k.a)
l=i.h(0)
r="NoSuchMethodError: method not found: '"+H.d(k.b.a)+"'\nReceiver: "+m+"\nArguments: ["+l+"]"
return r}}
P.df.prototype={
h:function(a){return"Unsupported operation: "+this.a},
gW:function(a){return this.a}}
P.dd.prototype={
h:function(a){var s=this.a
return s!=null?"UnimplementedError: "+s:"UnimplementedError"},
gW:function(a){return this.a}}
P.bS.prototype={
h:function(a){return"Bad state: "+this.a},
gW:function(a){return this.a}}
P.cu.prototype={
h:function(a){var s=this.a
if(s==null)return"Concurrent modification during iteration."
return"Concurrent modification during iteration: "+P.ac(s)+"."}}
P.bQ.prototype={
h:function(a){return"Stack Overflow"},
gak:function(){return null},
$il:1}
P.cy.prototype={
h:function(a){var s=this.a
return s==null?"Reading static variable during its initialization":"Reading static variable '"+s+"' during its initialization"}}
P.f2.prototype={
h:function(a){return"Exception: "+this.a}}
P.er.prototype={
h:function(a){var s=this.a,r=""!==s?"FormatException: "+s:"FormatException"
return r}}
P.af.prototype={
gl:function(a){var s,r=this.gN(this)
for(s=0;r.B();)++s
return s},
M:function(a,b){var s,r,q
P.h3(b,"index")
for(s=this.gN(this),r=0;s.B();){q=s.gC()
if(b===r)return q;++r}throw H.a(P.fX(b,this,"index",null,r))},
h:function(a){return P.jB(this,"(",")")}}
P.G.prototype={
gv:function(a){return P.m.prototype.gv.call(C.T,this)},
h:function(a){return"null"}}
P.m.prototype={constructor:P.m,$im:1,
J:function(a,b){return this===b},
gv:function(a){return H.bO(this)},
h:function(a){return"Instance of '"+H.d(H.eM(this))+"'"},
au:function(a,b){throw H.a(P.i4(this,b.gbF(),b.gbK(),b.gbG()))},
toString:function(){return this.h(this)}}
P.dn.prototype={
h:function(a){return""},
$ibR:1}
P.aq.prototype={
gl:function(a){return this.a.length},
h:function(a){var s=this.a
return s.charCodeAt(0)==0?s:s}}
W.c.prototype={}
W.cj.prototype={
h:function(a){return String(a)}}
W.ck.prototype={
h:function(a){return String(a)}}
W.aA.prototype={$iaA:1}
W.cn.prototype={
gG:function(a){return a.data}}
W.a3.prototype={
gG:function(a){return a.data},
gl:function(a){return a.length}}
W.ct.prototype={
gG:function(a){return a.data}}
W.aD.prototype={
bM:function(a,b,c){if(c!=null){a.postMessage(new P.dp([],[]).R(b),c)
return}a.postMessage(new P.dp([],[]).R(b))
return},
$iaD:1}
W.em.prototype={
h:function(a){return String(a)}}
W.b.prototype={
h:function(a){return a.localName}}
W.e.prototype={$ie:1}
W.cD.prototype={
cB:function(a,b,c,d){return a.addEventListener(b,H.bg(c,1),d)}}
W.A.prototype={}
W.cE.prototype={
gG:function(a){return a.data}}
W.b0.prototype={$ib0:1}
W.cH.prototype={
gl:function(a){return a.length}}
W.bw.prototype={
gG:function(a){return a.data},
$ibw:1}
W.cU.prototype={
gG:function(a){var s=a.data,r=new P.eX([],[])
r.c=!0
return r.R(s)}}
W.bH.prototype={$ibH:1}
W.cV.prototype={
gG:function(a){return a.data}}
W.v.prototype={
h:function(a){var s=a.nodeValue
return s==null?this.ck(a):s},
$iv:1}
W.d2.prototype={
gG:function(a){return a.data}}
W.d4.prototype={
gG:function(a){return a.data}}
W.d6.prototype={
gl:function(a){return a.length}}
W.db.prototype={
gG:function(a){return a.data}}
W.S.prototype={}
W.bb.prototype={$ibb:1}
W.a5.prototype={$ia5:1}
P.fm.prototype={
a7:function(a){var s,r=this.a,q=r.length
for(s=0;s<q;++s)if(r[s]===a)return s
r.push(a)
this.b.push(null)
return q},
R:function(a){var s,r,q,p=this,o={}
if(a==null)return a
if(H.du(a))return a
if(typeof a=="number")return a
if(typeof a=="string")return a
if(a instanceof P.b_)return new Date(a.a)
if(t.L.b(a))return a
if(t.d.b(a))return a
if(t.I.b(a))return a
if(t.aE.b(a)||t.t.b(a)||t.x.b(a))return a
if(t.f.b(a)){s=p.a7(a)
r=p.b
q=o.a=r[s]
if(q!=null)return q
q={}
o.a=q
r[s]=q
a.F(0,new P.fn(o,p))
return o.a}if(t.j.b(a)){s=p.a7(a)
q=p.b[s]
if(q!=null)return q
return p.d1(a,s)}if(t.q.b(a)){s=p.a7(a)
r=p.b
q=o.b=r[s]
if(q!=null)return q
q={}
o.b=q
r[s]=q
p.df(a,new P.fo(o,p))
return o.b}throw H.a(P.eS("structured clone of other type"))},
d1:function(a,b){var s,r=J.av(a),q=r.gl(a),p=new Array(q)
this.b[b]=p
for(s=0;s<q;++s)p[s]=this.R(r.n(a,s))
return p}}
P.fn.prototype={
$2:function(a,b){this.a.a[a]=this.b.R(b)},
$S:17}
P.fo.prototype={
$2:function(a,b){this.a.b[a]=this.b.R(b)},
$S:18}
P.eW.prototype={
a7:function(a){var s,r=this.a,q=r.length
for(s=0;s<q;++s)if(r[s]===a)return s
r.push(a)
this.b.push(null)
return q},
R:function(a){var s,r,q,p,o,n,m,l,k=this,j={}
if(a==null)return a
if(H.du(a))return a
if(typeof a=="number")return a
if(typeof a=="string")return a
if(a instanceof Date)return P.hQ(a.getTime(),!0)
if(a instanceof RegExp)throw H.a(P.eS("structured clone of RegExp"))
if(typeof Promise!="undefined"&&a instanceof Promise)return P.lh(a,t.z)
s=Object.getPrototypeOf(a)
if(s===Object.prototype||s===null){r=k.a7(a)
q=k.b
p=j.a=q[r]
if(p!=null)return p
o=t.z
p=P.cS(o,o)
j.a=p
q[r]=p
k.de(a,new P.eY(j,k))
return j.a}if(a instanceof Array){n=a
r=k.a7(n)
q=k.b
p=q[r]
if(p!=null)return p
o=J.av(n)
m=o.gl(n)
p=k.c?new Array(m):n
q[r]=p
for(q=J.ca(p),l=0;l<m;++l)q.q(p,l,k.R(o.n(n,l)))
return p}return a}}
P.eY.prototype={
$2:function(a,b){var s=this.a.a,r=this.b.R(b)
J.P(s,a,r)
return r},
$S:19}
P.dp.prototype={
df:function(a,b){var s,r,q,p
for(s=Object.keys(a),r=s.length,q=0;q<r;++q){p=s[q]
b.$2(p,a[p])}}}
P.eX.prototype={
de:function(a,b){var s,r,q,p
for(s=Object.keys(a),r=s.length,q=0;q<s.length;s.length===r||(0,H.ay)(s),++q){p=s[q]
b.$2(p,a[p])}}}
P.bC.prototype={$ibC:1}
P.fu.prototype={
$1:function(a){var s=function(b,c,d){return function(){return b(c,d,this,Array.prototype.slice.apply(arguments))}}(P.ku,a,!1)
P.hd(s,$.fR(),a)
return s},
$S:3}
P.fv.prototype={
$1:function(a){return new this.a(a)},
$S:3}
P.fx.prototype={
$1:function(a){return new P.bA(a)},
$S:20}
P.fy.prototype={
$1:function(a){return new P.aG(a,t.r)},
$S:21}
P.fz.prototype={
$1:function(a){return new P.ag(a)},
$S:22}
P.ag.prototype={
n:function(a,b){if(typeof b!="string"&&typeof b!="number")throw H.a(P.x("property is not a String or num"))
return P.hb(this.a[b])},
q:function(a,b,c){if(typeof b!="string"&&typeof b!="number")throw H.a(P.x("property is not a String or num"))
this.a[b]=P.hc(c)},
J:function(a,b){if(b==null)return!1
return b instanceof P.ag&&this.a===b.a},
h:function(a){var s,r
try{s=String(this.a)
return s}catch(r){H.n(r)
s=this.cp(0)
return s}},
t:function(a,b){var s=this.a,r=b==null?null:P.h0(new H.ah(b,P.lc(),H.ha(b).p("ah<1,@>")),t.z)
return P.hb(s[a].apply(s,r))},
gv:function(a){return 0}}
P.bA.prototype={}
P.aG.prototype={
be:function(a){var s=this,r=a<0||a>=s.gl(s)
if(r)throw H.a(P.ap(a,0,s.gl(s),null,null))},
n:function(a,b){if(H.aQ(b))this.be(b)
return this.cm(0,b)},
q:function(a,b,c){if(H.aQ(b))this.be(b)
this.cq(0,b,c)},
gl:function(a){var s=this.a.length
if(typeof s==="number"&&s>>>0===s)return s
throw H.a(P.d7("Bad JsArray length"))},
$iB:1}
P.bc.prototype={
q:function(a,b,c){return this.cn(0,b,c)}}
P.eJ.prototype={
h:function(a){return"Promise was rejected with a value of `"+(this.a?"undefined":"null")+"`."}}
P.fI.prototype={
$1:function(a){var s=this.a.a
if(s.a!==0)H.t(P.d7("Future already completed"))
s.cC(a)
return null},
$S:5}
P.fJ.prototype={
$1:function(a){if(a==null)return this.a.bv(new P.eJ(a===undefined))
return this.a.bv(a)},
$S:5}
P.cC.prototype={}
B.cz.prototype={
cv:function(a,b,c,d){this.a=a
this.c=c
this.d=d},
h:function(a){return Y.i(["Error code: [",this.a,"] - ",this.c," - ",this.d])}}
K.cK.prototype={
cw:function(a,b,c){var s,r,q,p=this,o=D.bG(10,a)
p.c=o
s=p.e=0
r=p.x=new S.aN()
for(;s<o;++s,r=q){q=new S.aN()
r.d=q}p.x=r},
Y:function(a){var s,r,q=this,p=null,o=q.$ti
q.a=new H.y(o.p("@<1*>").X(o.p("aN<1*,2*>*")).p("y<1,2>"))
q.b=new H.y(o.p("y<2*,j*>"))
s=q.f
for(;!1;s=r){r=s.gbH()
s.see(p)
s.sbH(p)
s.sed(0,p)
s.sbI(p)
o=q.x
o.d=s
o.toString
q.x=s}q.f=null
q.e=0},
h:function(a){return Y.i(["[HashMap, size=",this.e,"]"])}}
Y.cL.prototype={
gG:function(a){return this.b.gbI()},
dA:function(){var s=this.b.gbI()
this.b=this.b.gbH()
return s}}
S.aN.prototype={}
L.eV.prototype={}
Q.eq.prototype={
$1:function(a){this.a.a+=H.d(a)},
$S:4}
U.cB.prototype={}
U.bu.prototype={
h:function(a){var s=this.a
if(s!=null)return this.b+": "+s
return"FlashError"},
gW:function(a){return this.a},
gae:function(a){return this.b}}
U.bv.prototype={}
U.cT.prototype={}
B.dM.prototype={}
M.a8.prototype={
cu:function(a,b,c){var s,r,q=this
if(a==null)throw H.a(P.x("inputData is null"))
s=a.byteOffset
if(c===0)c=a.byteLength-b
r=s+b
q.r=H.eH(a.buffer,r,c)
q.x=H.b7(a.buffer,r,c)
q.c=0
q.f=q.e=q.d=c
q.z=q.y=!0},
gl:function(a){return this.e},
sl:function(a,b){var s,r=this,q=r.e
if(b===q)return
if(r.y!==!0||b>r.f){r.aC(b)
return}if(b<q){s=r.x;(s&&C.k).ad(s,b,q,0)}r.e=b
r.d=b-r.c
return},
ga5:function(){var s=this.e-this.c
return s>0?s:0},
sP:function(a,b){if(b==null)throw H.a(P.bP("Attempt to set null ByteArray position"))
if(b<0)throw H.a(P.bP("Attempt to set negative ByteArray position: "+C.c.h(b)))
this.c=b
this.d=this.e-b},
Y:function(a){var s=this
s.x=s.r=null
s.f=s.e=s.d=s.c=0
s.z=s.y=!1},
n:function(a,b){return this.x[b]},
av:function(a,b,c){var s,r=this
if(c<0||b<0)throw H.a(P.bP("Illegal negative offset= "+C.c.h(b)+", or length= "+C.c.h(c)))
if(c===0){c=r.d
c=c>0?c:0}else if(c>r.d)throw H.a(U.al(""))
s=a.c
a.e8(r.x,r.c,b,c)
a.sP(0,s)
r.c=r.c+c
r.d=r.d-c},
a_:function(){var s,r,q,p=this,o=p.d
if(o<1)throw H.a(U.al(""))
s=p.x
r=p.c
q=s[r]
p.c=r+1
p.d=o-1
return q},
aT:function(){var s,r,q,p=this
if(p.d<4)throw H.a(U.al(""))
s=p.r
r=p.c
q=s.getUint32(r,C.m===((p.a?"littleEndian":"bigEndian")==="littleEndian"?C.m:C.v))
p.c=p.c+4
p.d=p.d-4
return q},
w:function(){var s,r,q,p=this
if(p.d<2)throw H.a(U.al(""))
s=p.r
r=p.c
q=s.getUint16(r,C.m===((p.a?"littleEndian":"bigEndian")==="littleEndian"?C.m:C.v))
p.c=p.c+2
p.d=p.d-2
return q},
aC:function(a){var s,r,q,p,o,n=this
if(n.z===!0)throw H.a(U.al("Can't write past end of fixed buffer."))
s=n.e
r=n.Q
if(r<64)r=64
q=s*2
if(q<r)q=r
if(a>q)q=a+(r/2|0)
p=new Uint8Array(q)
o=n.x
if(o!=null&&o.length!==0)C.k.b8(p,0,s,o)
n.r=H.eH(p.buffer,0,q)
n.x=p
n.f=q
n.e=a
n.d=a-n.c
n.y=!0},
ag:function(a,b,c){var s,r,q,p,o,n,m,l=this
if(b==null)b=0
s=a.e
r=b+(c===0?s:c)
q=b<0?0:b
p=(r>s?s:r)-q
if(p<=0)return
o=l.y
n=l.c
m=n+p
if(o!==!0||m>l.f)l.aC(m)
else if(m>l.e){l.e=m
l.d=m-n}o=l.x
n=l.c;(o&&C.k).ab(o,n,n+p,a.x,q)
l.c=l.c+p
l.d=l.d-p},
A:function(a){return this.ag(a,0,0)},
e8:function(a,b,c,d){var s,r,q=this
if(d==null||d===0)return
if(a==null)throw H.a(P.x("source list is null"))
if(b==null)b=0
if(b<0||c<0)throw H.a(P.bP("Illegal negative source offset= "+P.ac(b)+", or destination offset= "+P.ac(c)))
if(b+d>a.byteLength)throw H.a(P.bP("source offset and length too large for source buffer"))
s=c+d
if(q.y!==!0||s>q.f)q.aC(s)
else if(s>q.e){q.e=s
q.d=s-q.c}r=q.x;(r&&C.k).ab(r,c,s,a,b)
q.c=s
q.d=q.e-s},
d9:function(){var s,r,q,p=this,o=p.x
if(o==null)return new Uint8Array(0)
if(p.y!==!0){s=p.e
if(!H.aQ(s))H.t(P.x("Invalid length "+H.d(s)))
r=new Uint8Array(s)
C.k.b8(r,0,s,o)
p.Y(0)
return r}s=p.e
if(s!=p.f){q=o.byteOffset
o=H.b7(o.buffer,q,s)}p.Y(0)
return o},
ds:function(){var s,r,q=this,p=q.x
if(p!=null)if(!(q.e<=0))s=!1
else s=!0
else s=!0
if(s)return new Uint8Array(0)
s=q.e
if(s!=q.f||!1){r=p.byteOffset
p=H.b7(p.buffer,r,s)}return p}}
N.dP.prototype={}
K.cs.prototype={
dB:function(){var s=this
if(s===$.hq()||s===$.hs()||s===$.hr())return 4
else if(s===$.dw())return 1
return 3}}
T.e3.prototype={}
N.et.prototype={}
F.ch.prototype={
bY:function(a){if(a===0)return this.a
return this.b},
u:function(){var s,r=this,q=r.a
if(q!==0){s=H.f([q],t.l)
$.p().t("free",s)
r.a=0}q=r.b
if(q!==0){s=H.f([q],t.l)
$.p().t("free",s)
r.b=0}}}
F.bn.prototype={
c_:function(){var s=this.b0()
if(s==null)return null
if(s instanceof F.bn)return s
else throw H.a(S.Q(Y.u(u.f,this.a)))},
ay:function(){var s=this.db.k2
s=$.fN().n(0,s)
if(s==null)throw H.a(S.Q(Y.u("ColorSpace is not recognized: ",this.db.k2)))
if(s===$.dw())return this.cx?C.j:C.n
if(s===$.fK())return C.l
else if(s===$.ht())return C.H
else if(s===$.fL())return C.r
else if(s===$.fM())return C.t
throw H.a(S.Q("ColorSpace not supported yet: "+s.b))},
bV:function(){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0=this,a1="Error allocating ",a2=0,a3=0,a4=C.a.E((a0.b.j(0).c+1)/2),a5=C.a.E((a0.b.j(0).d+1)/2)
if(J.k(a3,0)){a4=a0.b.j(0).c
a5=a0.b.j(0).d}s=a4*a5
r=0
q=0
p=0
o=R.ad(a0.cy)
n=0
for(a2=0;a2<a0.cy;++a2){f=a2
e=a0.db
d=a2
J.P(o,f,K.fU(e.k4,d))
n+=J.h(o,a2)}c=a0.db.k2
m=!1
if(c===6||c===7)if(C.a.b3(s,2)!==0)m=!0
try{l=s*n
if(m)++l
b=H.f([s*n],t.i)
p=$.p().t("alloc",b)
if(J.k(p,0)){f=U.U(Y.i([a1,s*n," bytes"]))
throw H.a(f)}k=p
for(a2=0,f=t.l;a2<a0.cy;++a2){j=s
if(J.k(J.h(o,a2),1)){r=a0.ac(k,j,j,a2,a3,!1)
k+=s
if(J.k(a2,0)&&m)++k}else if(J.k(J.h(o,a2),2)){i=a0.aA(j,2)
if(i==null){f=U.U(Y.i([a1,j*2," bytes"]))
throw H.a(f)}r=a0.ac(J.h(i,0),j,j,a2,a3,!1)
q=a0.ac(J.h(i,1),j,j,a2,a3,!0)
b=H.f([r,q,s,k],f)
h=$.p().t("interleaveBytesToShorts",b)
if(!J.k(h,0)){f=P.x("Interleaving data failed")
throw H.a(f)}k+=s*2}else{f=P.x(Y.i(["Bad bytesPerChannel for channel ",a2," of ",J.h(o,a2)]))
throw H.a(f)}}}catch(a){f=H.n(a)
if(t.k.b(f)){g=f
if(!J.k(p,0)){b=H.f([p],t.l)
$.p().t("free",b)
p=0}$.fO().i(C.b,new F.e_(g),null,null)
throw H.a(g)}else throw a}finally{}return p},
af:function(){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,b0,b1,b2,b3,b4,b5,b6,b7,b8,b9,c0,c1,c2,c3,c4,c5,c6,c7,c8,c9,d0,d1,d2,d3,d4,d5,d6,d7,d8,d9,e0,e1,e2,e3,e4,e5,e6,e7,e8,e9,f0,f1,f2,f3,f4=this,f5=null,f6="Can't allocate alchemy memory of size ",f7=0,f8=0
if(f4.y){$.fO().i(C.b,"prepare: tile is already disposed.",f5,f5)
return-1}if(f4.z!=null)return 0
if(!f4.aO())return-1
s=C.a.E((f4.b.j(0).c+1)/2)
r=C.a.E((f4.b.j(0).d+1)/2)
if(f4.x){s=f4.b.j(0).c
r=f4.b.j(0).d}q=R.cG(28)
p=0
for(p=0;p<28;++p)J.P(q,p,0)
o=f4.k2
n=o.ah(s,r)
m=f4.Q>4
l=0
try{c2=new Y.aO()
c2.K(f4.a,f4.b.j(0),f4.c,f4.d)
f4.z=c2
if(f4.x){f7=f4.bV()
f4.z.a3(f7,n,o)}else{k=f4.c_()
if(k==null||k.af()<0){c2=S.Q("Can't prepare parent tile")
throw H.a(c2)}f7=k.cY()
j=s*r
i=0
h=m?4:3
for(f8=0;c2=f8,c3=f4.cy,c2<c3;++f8)for(g=1;g<4;++g){i=f4.Q*f8+g
if(!J.k(f4.r[i],0))++h}h*=c3
f=C.a.k((j+1)/2)*2
e=f4.aA(f,h)
if(e==null){c2=U.U(Y.u(f6,f*h))
throw H.a(c2)}d=0
c=H.f([],t.o)
b=H.f([],t.l)
c2=t.i
a=H.f([],c2)
for(f8=0;f8<f4.cy;++f8){a0=0
for(p=0;p<3;++p){a0=p*2+f8*7
a1=p+1
i=f4.Q*f8+a1
J.P(q,a0,f4.aS(J.h(e,d),f,j,f8,a1,!1,c,b,a));++d
if(!J.k(f4.r[i],0)){J.P(q,a0+1,f4.aS(J.h(e,d),f,j,f8,a1,!0,c,b,a));++d}}if(m){a0=6+f8*7
J.P(q,a0,f4.aS(J.h(e,d),f,j,f8,4,!1,c,b,a));++d}}Q.jI(c,b,a,f4.fx.a)
a2=k.b.j(0)
c3=t.X
a3=new U.w(C.a.k(f4.b.j(0).a/2),C.a.k(f4.b.j(0).b/2),s,r,c3)
a4=a2.bC(a3)
J.j6(a4,-a2.a,-a2.b)
if(a4.c!==s||a4.d!==r){c2=S.Q("Block alignment error.  Parent region "+J.az(a2)+" does not fully enclose the higher-resolution tile region "+f4.gdW(f4).h(0))
throw H.a(c2)}a5=o.ah(f4.b.j(0).c,f4.b.j(0).d)
c4=H.f([a5],c2)
c2=$.p()
l=c2.t("alloc",c4)
if(J.k(l,0)){c2=U.U(Y.u(f6,a5))
throw H.a(c2)}a6=new U.w(0,0,f4.b.j(0).c,f4.b.j(0).d,c3)
c3=f4.db
a7=K.jq(c3.k3,c3.k4)
a8=-1
if(o.b>=6){a9=0
b0=f4.b_(0)
b1=0
b2=0
b3=0
b4=0
b5=0
if(b0!=null){b1=b0.e
b6=b0.a-f4.a
b5=b6-1
b7=b0.b.j(0)
b8=C.a.E(f4.b.j(0).a)
b9=C.a.E(f4.b.j(0).b)
b2=C.a.aj(b8,b6)-b7.a
b3=C.a.aj(b9,b6)-b7.b
b4=b7.c}c3=l
c5=f4.db.k2
c6=f4.b.j(0)
c7=f4.b.j(0)
c8=f7
c9=a2.c
d0=a2.d
d1=J.h(q,0)
d2=J.h(q,7)
d3=J.h(q,14)
d4=J.h(q,21)
d5=J.h(q,2)
d6=J.h(q,9)
d7=J.h(q,16)
d8=J.h(q,23)
d9=J.h(q,4)
e0=J.h(q,11)
e1=J.h(q,18)
e2=J.h(q,25)
e3=J.h(q,6)
e4=J.h(q,13)
e5=J.h(q,20)
e6=J.h(q,27)
e7=b1
e8=b2
e9=b3
f0=b4
f1=b5
f2=f4.k3.a
a8=c2.t("inverseHaarColorSeparatePlaneFromByteArrays",H.f([c3,c5,a9,c6.c,c7.d,Q.aK(a6),c8,c9,d0,Q.aK(a4),d1,d2,d3,d4,d5,d6,d7,d8,d9,e0,e1,e2,e3,e4,e5,e6,e7,e8,e9,f0,f1,f2],t.M))}else if(f4.cx){c3=a7?1:0
c5=l
c6=f4.b.j(0)
c7=f7
c8=a2.c
c9=J.h(q,0)
d0=J.h(q,2)
d1=J.h(q,4)
d2=J.h(q,6)
d3=f4.k3.a
a8=c2.t("inverseHaar8FromByteArrays",H.f([c3,c5,c6.c,Q.aK(a6),c7,c8,Q.aK(a4),c9,d0,d1,d2,d3],t.M))}else if(m){c3=a7?1:0
c5=l
c6=f4.b.j(0)
c7=f7
c8=a2.c
c9=J.h(q,0)
d0=J.h(q,1)
d1=J.h(q,2)
d2=J.h(q,3)
d3=J.h(q,4)
d4=J.h(q,5)
d5=J.h(q,6)
d6=f4.k3.a
a8=c2.t("inverseHaar16FromByteArrays",H.f([c3,c5,c6.c,Q.aK(a6),c7,c8,Q.aK(a4),c9,d0,d1,d2,d3,d4,d5,d6],t.M))}else{c3=l
c5=f4.b.j(0)
c6=f7
c7=a2.c
c8=J.h(q,0)
c9=J.h(q,1)
d0=J.h(q,2)
d1=J.h(q,3)
d2=J.h(q,4)
d3=J.h(q,5)
d4=f4.k3.a
a8=c2.t("inverseHaarFromByteArrays",H.f([c3,c5.c,Q.aK(a6),c6,c7,Q.aK(a4),c8,c9,d0,d1,d2,d3,d4],t.M))}c0=l
l=0
f4.z.a3(c0,a5,o)
if(!J.k(a8,0)){c2=S.Q("prepare: inverse Haar Transform failed.  Probably failed to get source blocks.")
throw H.a(c2)}}}catch(f3){c2=H.n(f3)
if(t.k.b(c2)){c1=c2
$.fO().i(C.b,new F.e0(f4,c1),f5,f5)
if(!J.k(l,0)){c4=H.f([l],t.l)
$.p().t("free",c4)
l=0}c2=f4.z
if(c2!=null){c2.al()
c2.ar()
f4.z=null}return-2}else throw f3}finally{}return 1}}
F.e_.prototype={
$0:function(){var s=this.a
return"getAlchemyShortPointer: "+H.d(U.b1(s))+": "+H.d(U.J(s))},
$S:0}
F.e0.prototype={
$0:function(){var s=this.a,r=this.b
return"prepare: level "+s.a+", row="+s.d+", col="+s.c+": "+H.d(U.b1(r))+": "+H.d(U.J(r))},
$S:0}
Y.aZ.prototype={
c0:function(){var s=this.b0()
if(s==null)return null
if(s instanceof Y.aZ)return s
else throw H.a(S.Q(Y.u(u.f,this.a)))},
ay:function(){var s=this.db.k2
s=$.fN().n(0,s)
if(s==null)throw H.a(S.Q(Y.u("ColorSpace is not recognized: ",this.db.k2)))
if(s===$.dw())return this.cx?C.j:C.n
if(s===$.fK())return C.l
else if(s===$.fL())return C.r
else if(s===$.fM())return C.t
throw H.a(S.Q("ColorSpace not supported yet: "+s.b))},
bW:function(a2){var s,r,q,p,o,n,m,l,k,j,i,h,g=this,f="Error allocating ",e=g.db.a1(a2),d=g.db.a2(a2),c=R.cG(2),b=g.dl(a2,0),a=g.a!==0||a2===0||e===1||d===1,a0=b?2:1,a1=0
J.P(c,0,0)
J.P(c,1,0)
if(!a)return c
s=g.k3[a2]
if(s!=null){if(b&&s.b===0)throw H.a(S.Q(Y.i(["High block exists for channel ",a2," but was not decompressed successfully"])))
J.P(c,0,s.a)
J.P(c,1,s.b)
return c}g.b.j(0)
g.b.j(0)
if(!g.k4){p=g.a
o=$.hL[p]
n=Y.hK(e,d)[p]}else{o=8
n=64}m=o*e
l=o*d
r=C.a.E((g.b.j(0).c+m-1)/m)*C.a.E((g.b.j(0).d+l-1)/l)*n
try{if(g.a===0){c=g.aA(r,2)
if(c==null){p=U.U(Y.i(["Error allocating temporary ",r*2," bytes"]))
throw H.a(p)}if(!b)J.P(c,1,0)}else{p=g.k3
k=new F.ch()
k.c=r
p[a2]=k
s=p[a2]
for(a1=0,p=t.i;a1<a0;++a1){k=s
j=a1
k.toString
if(j===0){if(k.a!==0)H.t(P.x("Already allocated low bytes"))
i=H.f([k.c],p)
j=$.p().t("alloc",i)
k.a=j
if(j===0)H.t(U.U(Y.i([f,k.c," bytes"])))}else if(j===1){if(k.b!==0)H.t(P.x("Already allocated high bytes"))
i=H.f([k.c],p)
j=$.p().t("alloc",i)
k.b=j
if(j===0)H.t(U.U(Y.i([f,k.c," bytes"])))}else H.t(P.x(Y.u("lowOrHigh must be 0 or 1, not ",j)))
J.P(c,a1,s.bY(a1))}}for(a1=0;a1<a0;++a1)J.P(c,a1,g.ac(J.h(c,a1),r,r,a2,0,!J.k(a1,0)))}catch(h){p=H.n(h)
if(t.k.b(p)){q=p
if(s!=null){s.u()
g.k3[a2]=null
s=null}$.fP().i(C.b,new Y.e1(q),null,null)
throw H.a(q)}else throw h}finally{}return c},
bZ:function(a2,a3){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a=this,a0=a3.length-1,a1=new Y.eB()
a1.e=a0+1
a1.ca()
s=a.db.a1(a2)
r=a.db.a2(a2)
q=Y.hK(s,r)
p=a.b.j(0)
for(o=a.a,n=t.X;o<=a0;++o){m=a3[o].bW(a2)
l=a3[o].b
k=l.a
j=l.b
if(!a.k4){i=$.hL[o]
h=q[o]}else{i=8
h=64}g=i*s
f=i*r
e=C.a.E((l.c+g-1)/g)
d=C.a.E((p.a-k+g-1)/g)
c=(C.a.E((p.b-j+f-1)/f)*e+d)*h
l=m[0]
k=m[1]
if(c<0)H.t(P.x(Y.u("bad sourceOffset of ",c)))
j=a1.a
b=k!==0
j[o]=b?1:0
j=a1.b
j[o]=l!==0?l+c:0
l=a1.c
l[o]=b?k+c:0
a1.d[o]=h*e
p=new U.w(C.a.k(p.a/2),C.a.k(p.b/2),C.a.k((p.c+1)/2),C.a.k((p.d+1)/2),n)}return a1},
c6:function(){var s,r,q=this.k4?0:3,p=R.ae(q+1,!1,t.cz)
for(s=this.a,r=this;s<=q;++s){p[s]=r
r=r.c0()}return p},
af:function(){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,b0,b1,b2,b3,b4,b5,b6,b7,b8,b9,c0,c1,c2=this,c3=null
if(c2.y){$.fP().i(C.b,"prepare: tile is already disposed.",c3,c3)
return-1}if(c2.z!=null)return 0
if(!c2.aO())return-1
s=0
try{i=new Y.aO()
i.K(c2.a,c2.b.j(0),c2.c,c2.d)
c2.z=i
r=c2.b.j(0).c*c2.b.j(0).d
q=!c2.cx
p=q?2:1
o=r*p*c2.cy
h=H.f([o],t.i)
s=$.p().t("alloc",h)
if(J.k(s,0)){i=U.U(Y.u("Can't allocate alchemy memory of size ",o))
throw H.a(i)}n=c2.c6()
for(m=0,i=t.l;m<c2.cy;++m){l=c2.bZ(m,n)
g=l
f=m
e=s
d=m
c=q===!0
b=c2.b
a=b.c
b=b.d
if(e===0)H.t(S.Q("Output pointer is null."))
p=c?2:1
a0=e+r*d*p
a1=g.b
a2=g.c
a3=g.d
a4=g.a
a5=c2.db.d_(f)
a6=c?1:0
a7=c2.db.a1(f)
a8=c2.db.a2(f)
if(f>0){a9=c2.b_(f)
if(a9!=null){b0=a9.e
b1=a9.a-c2.a
g=a9.b
f=g.a
e=g.b
b2=C.a.E(c2.b.a)
b3=C.a.E(c2.b.b)
d=C.c.aj(b2,b1)
b4=C.c.aj(b3,b1)
b5=C.a.k(g.c)
b6=C.a.k((d-f)/a7)
b7=C.a.k((b4-e)/a8)
b5=C.a.k((b5+a7-1)/a7)
if(b0!==0){b0=b0+b7*b5+b6
b8=b5
b9=b0}else{b9=0
b8=0}}else{b9=0
b8=0}}else{b9=0
b8=0}if(c2.k4){h=H.f([a7,a8,a5,a,b,a1[0],a2[0],a3[0],a0,a6,a,b9,b8,c2.r1.a],i)
c0=$.p().t("jpegDecompressFullFromOneStream",h)}else{g=c2.a
switch(g){case 0:h=H.f([a7,a8,a5,a,b,a4[3],a1[3],a2[3],a3[3],a4[2],a1[2],a2[2],a3[2],a4[1],a1[1],a2[1],a3[1],a4[0],a1[0],a2[0],a3[0],a0,a6,a,b9,b8,c2.r1.a],i)
c0=$.p().t("jpegDecompressFull",h)
break
case 1:h=H.f([a7,a8,a5,a,b,a4[3],a1[3],a2[3],a3[3],a4[2],a1[2],a2[2],a3[2],a4[1],a1[1],a2[1],a3[1],a0,a6,a,b9,b8,c2.r1.a],i)
c0=$.p().t("jpegDecompressHalf",h)
break
case 2:h=H.f([a7,a8,a5,a,b,a4[3],a1[3],a2[3],a3[3],a4[2],a1[2],a2[2],a3[2],a0,a6,a,b9,b8,c2.r1.a],i)
c0=$.p().t("jpegDecompressQuarter",h)
break
case 3:h=H.f([a7,a8,a5,a,b,a4[3],a1[3],a2[3],a3[3],a0,a6,a,b9,b8,c2.r1.a],i)
c0=$.p().t("jpegDecompressEighth",h)
break
default:H.t(S.Q(Y.u("Can't reconstruct JPEG at level ",g)))
c0=-1}}if(c0!==0)H.t(S.Q("Error in parameters when trying to reconstruct JPEG."))}k=s
s=0
c2.z.a3(k,o,c2.k2)}catch(c1){i=H.n(c1)
if(t.k.b(i)){j=i
$.fP().i(C.b,new Y.e2(c2,j),c3,c3)
if(!J.k(s,0)){h=H.f([s],t.l)
$.p().t("free",h)
s=0}i=c2.z
if(i!=null){i.al()
i.ar()
c2.z=null}return-2}else throw c1}finally{}return 1},
dg:function(){var s,r,q=this.k3,p=q.length
for(s=0;s<p;++s){r=q[s]
if(r!=null){r.u()
q=this.k3
q[s]=null}}},
u:function(){this.ci()
this.dg()}}
Y.e1.prototype={
$0:function(){var s=this.a
return"getAlchemyDecompressedPointers: "+H.d(U.b1(s))+": "+H.d(U.J(s))},
$S:0}
Y.e2.prototype={
$0:function(){var s=this.a,r=this.b
return"prepare: level "+s.a+", row="+s.d+", col="+s.c+": "+H.d(U.b1(r))+": "+H.d(U.J(r))},
$S:0}
Y.eB.prototype={
ca:function(){var s,r,q,p,o=this
o.a=R.ad(o.e)
o.b=R.cG(o.e)
o.c=R.cG(o.e)
o.d=R.ad(o.e)
for(s=o.e,r=o.b,q=o.c,p=0;p<s;++p){r[p]=0
q[p]=0}}}
L.cf.prototype={
cr:function(a,b,c,d,e){var s,r,q=this
q.b=a
q.c=b
q.d=c
if(c>8){$.cb().i(C.b,new L.dA(c),null,null)
s=q.d=8}else s=c
q.e=R.ae(s+1,!1,t.a0)
q.z=!1
s=new K.cK(new H.y(t.w),new H.y(t.Y),t.p)
r=t.z
s.cw(1,r,r)
q.y=s},
c8:function(a,b){var s,r=this,q=null
if(r.f){$.cb().i(C.b,"Cannot set resolution into an already disposed IImage",q,q)
return-1}if(a>r.d){$.cb().i(C.b,new L.dC(r,a),q,q)
return-1}if(J.k(r.e[a],b))return 0
s=r.e
if(s[a]!=null){$.cb().i(C.b,new L.dD(a),q,q)
return-1}s[a]=b
return 0},
bw:function(){var s,r,q
try{this.d5(new N.et("memoryUseChanged"),this,C.R)}catch(r){q=H.n(r)
if(t.k.b(q)){s=q
$.cb().i(C.b,new L.dB(s),null,null)}else throw r}},
u:function(){var s,r,q,p=this
for(s=0;s<=p.d;++s){r=p.e[s]
if(r!=null){r.u()
p.e[s]=null}}q=new Y.cL()
q.b=p.y.f
for(;!1;)q.dA()
p.y.Y(0)
p.f=!0
p.bw()},
dv:function(a){if(a>this.d)return!1
return this.e[a]!=null},
ai:function(a){if(a>this.d)return null
return this.e[a]}}
L.dA.prototype={
$0:function(){return Y.i(["Invalid maximim resolution Level of ",this.a," set.  Setting to 8"])},
$S:2}
L.dC.prototype={
$0:function(){return Y.i(["Invalid level ",this.b," greater than the maximum ",this.a.d])},
$S:2}
L.dD.prototype={
$0:function(){return Y.u("Cannot set a new, different IImageResolution, when one already exists for level ",this.a)},
$S:2}
L.dB.prototype={
$0:function(){var s=this.a
return H.d(U.J(s))+" "+s.h(0)},
$S:0}
Q.dx.prototype={
cs:function(a,b,c,d,e){var s=this
s.a=a
s.b=b
s.c=c
s.x=d},
c9:function(a,b){var s,r,q=this,p=null
if(q.y){$.aV().i(C.b,"setTileSize: resolution is already disposed.",p,p)
return-1}if(a<=0||b<=0){$.aV().i(C.b,"setTileSize: tile Width or Height is 0",p,p)
return-1}s=q.Q==null
if(!s)if(a!==q.d||b!==q.e){$.aV().i(C.b,"setTileSize: tile Width or Height cannot be reset to different values",p,p)
return-1}q.d=a
q.e=b
if(s){q.f=C.a.k((q.b+a-1)/a)
s=C.a.k((q.c+b-1)/b)
q.r=s
q.Q=R.ae(s,!0,t.cc)
for(s=t.cQ,r=0;r<q.r;++r)q.Q[r]=R.ae(q.f,!0,s)}return 0},
c7:function(a,b,c){var s,r,q=this,p=null
if(q.y){$.aV().i(C.b,"setCompressedTile: resolution is already disposed.",p,p)
return-1}s=q.Q
if(s==null){$.aV().i(C.b,"setCompressedTile: not allowed when no tile size is set yet",p,p)
return-1}if(a>=q.f||b>=q.r){$.aV().i(C.b,new Q.dy(q,a,b),p,p)
return-1}r=J.h(s[b],a)
J.P(q.Q[b],a,c)
if(r!=null&&r!==c)r.u()
return 0},
bP:function(a){var s,r,q,p,o,n,m,l,k,j,i=this
if(i.Q==null)return new U.w(0,0,0,0,t.X)
s=a.a
r=C.a.k(s+0.49)
q=a.b
p=C.a.k(q+0.49)
o=C.a.k(s+a.c+0.49)
n=C.a.k(q+a.d+0.49)
m=C.a.k(D.bG(C.a.k(r/C.c.k(i.d)),0))
l=C.a.k(D.i3(C.a.k((o-1)/i.d),i.f-1))
k=C.a.k(D.bG(C.a.k(p/i.e),0))
j=C.a.k(D.i3(C.a.k((n-1)/i.e),i.r-1))
return new U.w(m,k,D.bG(l-m+1,0),D.bG(j-k+1,0),t.X)},
aY:function(a){var s,r,q=this,p=q.bP(a)
if(p.c===1&&p.d===1){s=p.b
r=p.a
if(J.h(q.Q[s],r)!=null)if(J.h(q.Q[s],r).ga8())return J.h(q.Q[s],r)}return null},
c5:function(a,b){var s=this
if(a<s.f&&b<s.r)if(J.h(s.Q[b],a)!=null)if(J.h(s.Q[b],a).ga8())return J.h(s.Q[b],a)
return null},
u:function(){var s,r,q,p,o=this,n=o.Q
if(n==null)return
s=n.length
r=J.aW(n[0])
for(q=0;q<s;++q)for(p=0;p<r;++p)if(J.h(o.Q[q],p)!=null)J.h(o.Q[q],p).u()
o.Q=null
o.y=!0},
aa:function(a,b){var s,r,q,p,o,n,m,l,k,j=this
if(j.y){$.aV().i(C.b,"writeToStream: resolution is already disposed.",null,null)
return}s=j.a
r=j.d
q=j.e
p=j.x?1:0
a.D(33618485,4294967295)
o=a.a
n=o.x
n[8]=s&255
n[9]=s>>>8&255
n[10]=r&255
n[11]=r>>>8&255
n[12]=q&255
n[13]=q>>>8&255
n[14]=p&255
n[15]=p>>>8&255
b.A(o)
for(m=0;m<j.r;++m)for(l=0;l<j.f;++l){k=J.h(j.Q[m],l)
if(k!=null&&k.ga8()&&!0)k.aa(a,b)}a.D(2181102133,0)
s=o.x
s[8]=0
s[9]=0
s[10]=0
s[11]=0
s[12]=0
s[13]=0
s[14]=0
s[15]=0
b.A(o)}}
Q.dy.prototype={
$0:function(){var s=this.a
return Y.i(["Tile index (",this.b,",",this.c,") is outside the allowed matrix (",s.f,",",s.r,")"])},
$S:2}
Y.dz.prototype={
K:function(a,b,c,d){var s=this
s.a=a
s.b=new U.w(C.a.k(b.a+0.49),C.a.k(b.b+0.49),C.a.k(b.c+0.49),C.a.k(b.d+0.49),t.X)
s.c=c
s.d=d},
gdW:function(a){var s=this.b
return new U.w(s.a,s.b,s.c,s.d,s.$ti.p("w<1*>"))},
ga8:function(){$.hp().i(C.b,"abstract isAvailable() method must be over-ridden",null,null)
return!1},
u:function(){$.hp().i(C.b,"abstract dispose() method must be over-ridden",null,null)}}
A.ci.prototype={
gcX:function(){var s,r
if(this.e!==0){s=$.p().n(0,"HEAPU8")
r=$.eE
if(r!=null&&r!==s)$.eE=$.h1=null
return s}return null},
gG:function(a){var s=this.gcX()
if(s!=null)return H.b7(s.buffer,J.aX(this.e),this.f)
return null},
a3:function(a,b,c){var s,r,q,p=this
p.e=a
p.f=b
p.r=c
try{if(!p.d2()){r=P.x("ByteArrayImageTile: failed verification of data sizes")
throw H.a(r)}p.d0()}catch(q){r=H.n(q)
if(t.k.b(r)){s=r
p.Z()
$.bh().i(C.b,new A.dJ(s),null,null)
throw H.a(s)}else throw q}},
aQ:function(a,b,c){var s,r,q,p,o,n,m,l,k
try{s=b.ga5()
r=c
if(r>s){q=Y.i(["ImageTileFromInputStream: try to read ",r," from ByteArray when only ",s," were available"])
l=U.al(q)
throw H.a(l)}p=Q.jH(b,r)
o=r
if(J.k(p,0)){n=Y.i(["ImageTileFromInputStream: Out of alchemy memory, or IOError, when trying to read ",r," bytes"])
l=U.U(n)
throw H.a(l)}this.a3(p,o,a)}catch(k){l=H.n(k)
if(t.k.b(l)){m=l
this.Z()
$.bh().i(C.b,new A.dI(m),H.f([U.hR(m)],t.V),null)
throw H.a(m)}else throw k}},
dq:function(a,b,c,d){var s,r,q,p,o,n,m,l,k,j,i,h=null,g=null,f=null
try{l=b.e
g=l
if(typeof l=="number"){k=g
k.toString}else k=Y.jx(g)
f=c
j=f
h=D.bG(k-j,0)
k=J.aX(h)
s=k>>>0
r=d
if(J.k(r,0))r=s
if(r>s){q=Y.i(["ByteArrayImageTile: try to read ",r," from ByteArray when only ",s," were available"])
k=U.al(q)
throw H.a(k)}p=Q.i1(b,c,r)
o=r
if(J.k(p,0)){n=Y.i(["ByteArrayImageTile: out of alchemy memory when trying to allocate ",r," bytes"])
k=U.U(n)
throw H.a(k)}this.a3(p,o,a)}catch(i){k=H.n(i)
if(t.k.b(k)){m=k
this.Z()
$.bh().i(C.b,new A.dH(m),H.f([U.hR(m)],t.V),null)
throw H.a(m)}else throw i}},
Z:function(){var s,r,q,p=this.e
if(p!==0){try{r=H.f([p],t.l)
$.p().t("free",r)}catch(q){p=H.n(q)
if(t.k.b(p)){s=p
$.bh().i(C.b,new A.dG(s),null,null)}else throw q}this.f=this.e=0}},
d2:function(){var s,r=this,q=null,p=r.r.ah(r.b.j(0).c,r.b.j(0).d)
if(r.f<p){$.bh().i(C.b,new A.dE(r,p),q,q)
return!1}s=r.r
if(s===C.G||s===C.E){$.bh().i(C.b,new A.dF(r),q,q)
return!1}return!0},
d0:function(){var s,r,q,p,o,n,m,l,k,j,i,h,g=this,f="convertToSmallerDataTypeIfRequired: out of alchemy memory when trying to allocate ",e=g.r
if(e===C.F||e===C.q){s=C.j
if(e===C.q)s=C.n
r=s.gbs()===1
q=s.ah(g.b.j(0).c,g.b.j(0).d)
p=0
try{l=H.f([q],t.i)
e=$.p()
p=e.t("alloc",l)
if(J.k(p,0)){o=Y.i([f,q," bytes"])
e=U.U(o)
throw H.a(e)}n=0
k=t.l
j=g.e
i=g.b
if(r)n=e.t("convertIntToCharPixels",H.f([j,i.j(0).c*g.b.j(0).d,p],k))
else n=e.t("convertIntToShortPixels",H.f([j,i.j(0).c*g.b.j(0).d,p],k))
if(!J.k(n,0)){m=Y.i([f,q," bytes"])
e=U.U(m)
throw H.a(e)}g.Z()
g.e=p
g.f=q
g.r=s}catch(h){if(t.k.b(H.n(h))){if(!J.k(p,0)){l=H.f([p],t.l)
$.p().t("free",l)
p=0}}else throw h}}},
u:function(){this.Z()}}
A.dJ.prototype={
$0:function(){return U.J(this.a)},
$S:0}
A.dI.prototype={
$0:function(){return U.J(this.a)},
$S:0}
A.dH.prototype={
$0:function(){return U.J(this.a)},
$S:0}
A.dG.prototype={
$0:function(){return U.J(this.a)},
$S:0}
A.dE.prototype={
$0:function(){return Y.i(["dataVerifiesOkay: Didn't allocate enough bytes for Tile. Needed ",this.b," and allocated ",this.a.f])},
$S:2}
A.dF.prototype={
$0:function(){return"dataVerifiesOkay: Don't support PixelSampleTypeEnum "+this.a.r.a+" in ByteArrayImageTile yet"},
$S:0}
T.br.prototype={}
R.es.prototype={
dE:function(a,b,c){var s,r,q=this,p=null
if(q.f){$.hu().i(C.b,"writeToBitmapData: resolution is already disposed.",p,p)
return!1}if(q.e==null){$.hu().i(C.b,"writeToBitmapData: null resolution Vector.  Internal error.",p,p)
return!1}if(q.dv(a)){s=q.e[a]
if(t.u.b(s))r=s.dD(b,c)
else r=!1}else r=!1
if(r)q.bw()
return r}}
F.bx.prototype={
dD:function(a,b){var s,r,q,p,o,n,m,l,k,j,i,h,g=this,f=null
if(g.y){$.fS().i(C.b,"prepareForWrite: resolution is already disposed.",f,f)
return!1}if(g.Q==null){$.fS().i(C.b,"prepareForWrite: not allowed when no tile size is set yet",f,f)
return!1}s=b.a
r=b.b
q=new U.w(s,r,g.b,g.c,t.X).bC(a)
q.bJ(0,-s,-r)
p=g.bP(q)
s=p.c
if(!(s>0&&p.d>0))return!1
o=p.b
n=o+p.d
m=p.a+s
for(l=!1,k=!1;o<n;++o)for(j=p.a;j<m;++j){i=J.h(g.Q[o],j)
if(i!=null){h=i.af()
if(h>0)l=!0
else if(h<0)k=!0}}if(k)$.fS().i(C.B,"prepareForWrite: Prepare failed on some tiles",f,f)
return l},
$ihT:1}
L.eu.prototype={}
Y.aO.prototype={
ar:function(){}}
S.eO.prototype={
ga8:function(){return this.f&&this.r&&this.x},
u:function(){var s,r=this
if(r.z)return
r.e=null
r.x=r.r=r.f=!1
s=r.y
if(s!=null){s.al()
s.ar()}r.y=null
r.z=!0},
af:function(){var s,r,q,p=this
if(p.z)return-1
if(p.y!=null)return 0
if(!(p.f&&p.r&&p.x))return-1
s=p.e
r=new Y.aO()
r.K(p.a,p.b.j(0),p.c,p.d)
p.y=r
try{r.dq(C.l,s,0,s.e)}catch(q){if(t.k.b(H.n(q))){p.y=null
return-1}else throw q}return 1},
aa:function(a,b){var s="Trying to write a disposed tile"
if(this.z){$.a2().i(C.b,s,null,null)
throw H.a(U.hS(s,0))}this.cU(a,b)},
cU:function(a,b){var s,r,q,p,o=this,n="Trying to write the tile into the compressed channel when the compressed data is not fully available"
if(!(o.f&&o.r&&o.x)){$.a2().i(C.b,n,null,null)
throw H.a(U.hS(n,0))}s=o.b.j(0).c*o.b.j(0).d
r=s+16
a.aW(C.c.k(3*r+32>>>0),o.c,o.d,o.b.j(0).c,o.b.j(0).d,b)
for(q=r>>>0,p=0;p<3;++p){a.bR(C.c.k(q),p,b)
a.aw(s,0,0,p,b)
b.ag(o.e,p*s,s)
a.bQ(b)}a.aV(b)},
b6:function(a,b,c,d,e,f,g){var s,r,q,p,o,n=this,m="Trying to write into a disposed tile",l=null,k="Cannot directly set decompressed data when the compressed data is not fully available",j="Cannot overwrite decompressed data",i="Data is unavailable or insufficient"
if(n.z){$.a2().i(C.b,m,l,l)
throw H.a(U.aE(m,0))}if(!(n.f&&n.r&&n.x)){$.a2().i(C.b,k,l,l)
throw H.a(U.aE(k,0))}if(n.y!=null){$.a2().i(C.b,j,l,l)
throw H.a(U.aE(j,0))}if(a!==0||b!==0||c!==C.o||d!==C.l||e!==0){r="Expected channel = 0, blockNumber = 0, decompressedType = AllPlanes, sampleTypeIfAllPlanes = RGB_COLOR_SEPARATE, expectingIsColorBitmask = 0; instead found channel = "+a+", blockNumber = "+b+", decompressedType = "+c.b+", sampleTypeIfAllPlane = "+d.a+", expectingIsColorBitmask = "+e
$.a2().i(C.b,r,l,l)
throw H.a(E.K(r))}q=n.b.j(0)
p=n.b.j(0)
q=f.ga5()<g||g!==q.c*p.d*3
if(q){$.a2().i(C.b,i,l,l)
throw H.a(E.K(i))}q=new Y.aO()
q.K(n.a,n.b.j(0),n.c,n.d)
n.y=q
try{q.aQ(d,f,g)}catch(o){q=H.n(o)
if(t.k.b(q)){s=q
n.y=null
throw H.a(s)}else throw o}},
b5:function(a,b,c,d){var s,r,q,p,o,n,m,l,k=this,j=null
if(k.z){$.a2().i(C.h,"Trying to write into a disposed tile",j,j)
return-1}if(a<0||a>=3||b!==0||c!==0){s="Expected 0 <= channel <= 2, blockNumber = 0, isHighByte = 0; instead found channel = "+a+", blockNumber = "+b+", isHighByte = "+c
$.a2().i(C.h,s,j,j)
return-1}r=k.b.j(0).c*k.b.j(0).d
q=d.e
if(q!==r){$.a2().i(C.h,"Data is unavailable or insufficient",j,j)
return-1}q=a===0
p=q&&k.f
o=a===1
n=o&&k.r
m=a===2&&k.x
if(p||n||m){s="Trying to overwrite an existing channel "+a
$.a2().i(C.h,s,j,j)
return-1}l=k.e
if(l==null){l=r*3
l=k.e=M.jd(new Uint8Array(l),0,l)}l.sP(0,a*r)
k.e.ag(d,0,r)
if(q)k.f=!0
else if(o)k.r=!0
else k.x=!0
return 0}}
M.dN.prototype={
aW:function(a,b,c,d,e,f){var s,r
this.D(50395701,a)
s=this.a
r=s.x
r[8]=b&255
r[9]=C.c.L(b,8)&255
r[10]=c&255
r[11]=C.c.L(c,8)&255
r[12]=d&255
r[13]=C.c.L(d,8)&255
r[14]=e&255
r[15]=C.c.L(e,8)&255
f.A(s)},
aV:function(a){var s,r
this.D(2197879349,0)
s=this.a
r=s.x
r[8]=0
r[9]=0
r[10]=0
r[11]=0
r[12]=0
r[13]=0
r[14]=0
r[15]=0
a.A(s)},
bR:function(a,b,c){var s,r
this.D(67172917,a)
s=this.a
r=s.x
r[8]=b&255
r[9]=b>>>8&255
r[10]=0
r[11]=0
r[12]=0
r[13]=0
r[14]=0
r[15]=0
c.A(s)},
bQ:function(a){var s,r
this.D(2214656565,0)
s=this.a
r=s.x
r[8]=0
r[9]=0
r[10]=0
r[11]=0
r[12]=0
r[13]=0
r[14]=0
r[15]=0
a.A(s)},
e4:function(a,b,c,d,e,f){var s,r,q,p,o,n
this.D(218167861,a)
s=this.a
r=s.x
r[8]=b&255
r[9]=b>>>8&255
q=e.length
if(q>8)q=8
for(p=0,o=0;o<q;++o)if(e[o])p=(p|C.c.bn(1,o))>>>0
n=c.a===1
r[10]=c.a
r[11]=n&&d!=null?d.b:0
r[12]=p
r[13]=0
r[14]=0
r[15]=0
f.A(s)}}
L.dO.prototype={}
Q.bk.prototype={}
V.co.prototype={
bt:function(){var s,r,q,p=this.d
if(p.length===0)return 0
for(p=Y.cF(p),s=p.length,r=0,q=0;q<s;++q)r+=p[q].b+16
return r}}
A.bm.prototype={}
D.cr.prototype={
b4:function(a,b){var s=this.a[a]
if(s!=null)s.Z()
this.a[a]=b},
bu:function(a){return this.b[a]||this.a[a]!=null},
u:function(){var s,r,q=this.a,p=q.length
for(s=0;s<p;++s){r=q[s]
if(r!=null){r.Z()
q=this.a
q[s]=null}}}}
A.ab.prototype={
ba:function(a,b,c,d,e,f,g,h){var s=this
s.x=e
s.db=h
s.Q=f
s.ch=g
s.cy=h.k1
s.fx=T.jp(h.r1)
s.cx=K.fU(h.k4,0)===1
e
s.dr()},
dr:function(){var s,r,q,p,o,n,m,l,k,j,i,h=this,g=t.A
h.e=R.ae(h.Q*h.cy,!1,g)
h.f=R.ae(h.Q*h.cy,!1,g)
g=R.ad(h.Q*h.cy)
h.r=g
for(s=h.cy,r=h.Q,q=h.db,p=h.a,o=0;o<s;++o)for(n=r*o,m=0;m<r;++m){l=q.k3
k=q.k4
j=p>=q.d
if(l===0||l===10){i=K.jr(k,o,j)?1:0
if(m===4)i=0}else i=2
if(j&&m===1)i=0
g[n+m]=i}},
az:function(a){var s,r,q,p,o,n=this,m=n.dy
if(m==null){if(n.cy<=1)return null}else if(m.bu(a))return n.dy
if(n.x){m=n.dy
if(m==null){m=n.cy
s=new D.cr()
s.a=R.ae(m,!1,t.E)
s.b=R.fV(m)
n.dy=s
m=s}s=n.Q
if(s>1&&n.e[s*a+1]!=null){m=n.b.j(0)
s=n.b.j(0)
r=new T.br()
r.K(n.a,n.b.j(0),n.c,n.d)
r.a3(n.bX(a,1),m.c*s.d,C.j)
n.dy.b4(a,r)}else m.b[a]=!0}else{m=n.db
q=t.cM.a(m.e[m.d])
p=C.c.cb(1,q.a-n.a)
o=t.ct.a(q.aY(new U.w(C.a.k(n.b.j(0).a/p),C.a.k(n.b.j(0).b/p),C.a.k(n.b.j(0).c/p),C.a.k(n.b.j(0).d/p),t.X)))
if(o!=null)n.dy=o.az(a)
else $.I().i(C.h,"no DC compressedTile available",null,null)}return n.dy},
b_:function(a){var s=this.az(a)
if(s==null)return null
return s.a[a]},
dl:function(a,b){var s=this,r=null,q=s.cy
if(a>=q){$.I().i(C.h,new A.dW(s,a),r,r)
return!1}if(s.x){q=s.Q
if(b>=q){$.I().i(C.h,new A.dX(s,b),r,r)
return!1}}else if(b<s.ch||b>=s.Q){$.I().i(C.h,new A.dY(s),r,r)
return!1}q=s.Q
return s.f[q*a+b]!=null},
b0:function(){var s,r,q,p=this,o=null,n=p.dx
if(n!=null){if(Y.jw(n.y)){$.I().i(C.h,"Found disposed parent.  Setting to null",o,o)
p.dx=null}else return n
n=o}if(!p.x){s=p.db.ai(p.a+1)
r=new U.w(C.a.k(p.b.j(0).a/2),C.a.k(p.b.j(0).b/2),C.a.k((p.b.j(0).c+1)/2),C.a.k((p.b.j(0).d+1)/2),t.X)
q=s.aY(r)
if(q==null){n=$.I()
if(800>=n.gaR().b)n.i(C.h,new A.dV(p,r),o,o)
return o}if(!(q instanceof A.ab))throw H.a(S.Q(Y.u("Parent tile is not a CompressedBaseTileData tile for current level ",p.a)))
p.dx=q
n=q}return n},
b6:function(a,b,c,d,e,f,g){var s,r,q,p,o,n,m=this,l=null,k="setDecompressedData: decompressed Type is null",j="setDecompressedData: PixelSampleType is null, and we are setting all-planes.",i="setDecompressedData: decompressedType is of normal SinglePlane is not supported."
if(c==null){$.I().i(C.b,k,l,l)
throw H.a(E.K(k))}if(m.x){s=m.dy
if(s==null){s=m.cy
r=new D.cr()
r.a=R.ae(s,!1,t.E)
r.b=R.fV(s)
m.dy=r
s=r}for(r=m.cy,q=0;q<r;++q){if((e&C.c.bn(1,q))===0)p=!(s.b[q]||s.a[q]!=null)
else p=!1
if(p)s.b[q]=!0}}s=c.a
if(s===1){if(d==null){$.I().i(C.b,j,l,l)
throw H.a(E.K(j))}if(m.z!=null){A.hJ(f,g)
return}s=new L.eu()
s.K(m.a,m.b.j(0),m.c,m.d)
s.aQ(d,f,g)
m.z=s}else if(s===2){if(a<0||a>=m.cy||!m.x){o=Y.i(["setDecompressedData: Error setting isColor Flags for channel ",a," when isDC = ",m.x," and numChannels = ",m.cy])
$.I().i(C.b,o,l,l)
throw H.a(E.K(o))}if(m.dy.bu(a)){A.hJ(f,g)
return}n=new T.br()
n.K(m.a,m.b.j(0),m.c,m.d)
n.aQ(C.j,f,g)
m.dy.b4(a,n)}else{$.I().i(C.b,i,l,l)
throw H.a(E.K(i))}},
b5:function(a,b,c,d){var s,r,q,p=this
if(p.y)return-1
if(a<0||a>=p.cy){$.I().i(C.h,new A.dZ(p,a),null,null)
return-1}s=p.Q
r=s*a+b
if(p.x){if(b<0||b>=s)return-1}else if(b<p.ch||b>=s)return-1
if(c!==0){if(J.k(p.r[r],0))return-1
s=p.f
q=s[r]
if(q!=null){J.cc(q)
s=p.f
s[r]=null}s[r]=d}else{s=p.e
q=s[r]
if(q!=null){J.cc(q)
s=p.e
s[r]=null}s[r]=d}return 0},
aO:function(){var s,r,q,p,o,n=this,m=n.ch,l=n.Q
if(n.x){m=0
l=1}for(s=0;s<n.cy;++s)for(r=s!==0,q=m;q<l;++q){p=n.Q*s+q
if(J.k(n.r[p],1)){o=n.f[p]
if(o==null)return!1
else if(o.e===0)return!1}o=n.e[p]
if(o==null){if(n.a!==0||!r||n.db.a1(s)===1||n.db.a2(s)===1)return!1}else if(o.e===0)return!1}return!0},
dm:function(){var s,r,q=this,p=q.z
if(p==null||p.e===0)return!1
if(q.x){p=q.dy
if(p==null)return!1
for(s=q.cy,r=0;r<s;++r)if(!(p.b[r]||p.a[r]!=null))return!1}return!0},
ac:function(a,b,c,d,e,f){var s,r,q,p,o,n,m=this
if(b<c)throw H.a(E.K("Bad passed alchemy buffer size"))
if(a===0)throw H.a(E.K("passed alchemy buffer is null."))
p=m.Q*d+e
s=0
r=null
if(f){if(J.k(m.r[p],0))throw H.a(E.K(Y.i(["Cannot get null highBytes for block ",e," on channel ",d])))
r=m.f[p]}else r=m.e[p]
try{s=Q.i2(r,a,c,m.fx.a)}catch(o){n=H.n(o)
if(t.k.b(n)){q=n
$.I().i(C.b,new A.dT(q),null,null)
throw H.a(E.K(U.J(q)))}else throw o}return s},
aS:function(a,b,c,d,e,f,g,h,i){var s,r,q=this
if(b<c)throw H.a(E.K("Bad passed alchemy buffer size"))
if(a===0)throw H.a(E.K("passed alchemy buffer is null."))
s=q.Q*d+e
if(f){if(J.k(q.r[s],0))throw H.a(E.K(Y.i(["Cannot get null highBytes for block ",e," on channel ",d])))
r=q.f[s]}else r=q.e[s]
g.push(r)
h.push(a)
i.push(c)
return a},
bX:function(a,b){var s,r,q,p,o,n,m,l,k,j,i,h,g=this
if(!g.x)throw H.a(P.x("getAlchemyLowBytePointerForIsColorFlagsDC can only be called for a DC block"))
s=g.b.j(0).c
r=g.b.j(0).d
if(a>0){l=g.db.a1(a)
k=g.db.a2(a)
if(l>1)s=C.a.k((s+l-1)/l)
if(k>1)r=C.a.k((r+k-1)/k)}q=s*r
p=0
o=0
try{n=s*r
j=H.f([q],t.i)
o=$.p().t("alloc",j)
if(J.k(o,0)){i=U.U(Y.i(["Error allocating ",q," bytes"]))
throw H.a(i)}p=g.ac(o,n,n,a,b,!1)}catch(h){i=H.n(h)
if(t.k.b(i)){m=i
if(!J.k(o,0)){j=H.f([o],t.l)
$.p().t("free",j)
o=0}$.I().i(C.b,new A.dU(m),null,null)
throw H.a(m)}else throw h}finally{}return o},
cY:function(){var s=this.z
if(s!=null)return s.e
$.I().i(C.h,new A.dS(this),null,null)
return 0},
ga8:function(){if(this.y)return!1
return this.aO()||this.dm()},
aA:function(a,b){var s,r,q=R.ad(b)
for(s=0;s<b;++s)q[s]=a
r=$.ia
return(r==null?$.ia=new Q.eP():r).c4(q)},
af:function(){$.I().i(C.b,"derived class must over-ride prepare!  Coding error.",null,null)
return-1},
u:function(){var s,r,q,p,o=this
for(s=0;s<o.cy;++s)for(r=0;q=o.Q,r<q;++r){p=q*s+r
q=o.f[p]
if(q!=null){J.cc(q)
o.f[p]=null}q=o.e[p]
if(q!=null){J.cc(q)
o.e[p]=null}}q=o.z
if(q!=null){q.al()
q.ar()
o.z=null}q=o.dy
if(q!=null)if(o.x)q.u()
o.dx=o.db=null
o.y=!0},
cV:function(a,b,c,d){var s,r,q,p,o,n,m,l,k,j,i=this
for(s=Y.cF(b),r=s.length,q=0,p=0;p<s.length;s.length===r||(0,H.ay)(s),++p){o=s[p]
if(o.d.length!==0)q+=o.bt()+32}a.aW(C.c.k(q>>>0),i.c,i.d,i.b.j(0).c,i.b.j(0).d,d)
for(s=Y.cF(b),r=s.length,o=a.a,p=0;p<s.length;s.length===r||(0,H.ay)(s),++p){n=s[p]
m=n.d
if(m.length===0)continue
l=n.a
a.e4(C.c.k(n.bt()>>>0),l,n.b,n.c,c,d)
for(n=Y.cF(m),m=n.length,k=0;k<n.length;n.length===m||(0,H.ay)(n),++k){j=n[k]
a.aw(j.b,j.c,0,l,d)
Q.jM(d,j.a,j.b)}a.D(2365651509,0)
n=o.x
n[8]=0
n[9]=0
n[10]=0
n[11]=0
n[12]=0
n[13]=0
n[14]=0
n[15]=0
d.A(o)}a.aV(d)},
cW:function(a,b,c){var s,r,q,p
if(this.x){s=this.az(a)
if(s==null||s.b[a])return b
r=s.a[a]
if(r==null)return b
b=V.hH(a,C.A,null)
q=r.e
r=r.f
p=new Q.bk(0/0)
p.a=q
p.b=r
p.c=c
b.d.push(p)}return b},
e5:function(a,b){var s,r,q,p,o,n,m,l,k=this
if(a.b.a){s=k.z
s=s==null||s.e===0}else s=!0
if(s)return!1
r=H.f([],t.W)
q=V.hH(0,C.o,k.z.r)
s=k.z
p=s.e
s=s.f
o=new Q.bk(0/0)
o.a=p
o.b=s
q.d.push(o)
r.push(q)
n=R.fV(k.cy)
for(m=0;m<k.cy;++m){l=k.cW(m,null,0)
if(l!=null){n[m]=!0
r.push(l)}}k.cV(a,r,n,b)
return!0},
aa:function(a,b){var s,r,q,p,o,n,m,l,k,j,i,h=this
if(h.e5(a,b))return
s=R.ad(h.cy)
for(r=h.cy,q=h.Q,p=h.f,o=h.e,n=0,m=0,l=0,k=0;m<r;++m){s[m]=0
for(j=q*m,l=0;l<q;++l){k=j+l
i=o[k]
if(i!=null)s[m]=s[m]+(i.e+16)
i=p[k]
if(i!=null)s[m]=s[m]+(i.e+16)}j=s[m]
if(j>0)n+=j+32}a.aW(C.c.k(n>>>0),h.c,h.d,h.b.j(0).c,h.b.j(0).d,b)
for(m=0;m<h.cy;++m){r=s[m]
if(r>0){a.bR(C.c.k(r>>>0),m,b)
for(l=0;r=h.Q,l<r;++l){k=r*m+l
r=h.e[k]
if(r!=null){a.aw(r.e,l,0,m,b)
b.A(h.e[k])}r=h.f[k]
if(r!=null){a.aw(r.e,l,1,m,b)
b.A(h.f[k])}}a.bQ(b)}}a.aV(b)}}
A.dW.prototype={
$0:function(){return"Bad channel number "+this.b+". Should be 0 to "+(this.a.cy-1)},
$S:0}
A.dX.prototype={
$0:function(){return"Bad DC block number "+this.b+". Should be 0 to "+(this.a.Q-1)},
$S:0}
A.dY.prototype={
$0:function(){var s=this.a
return"Bad AC block number "+s.ch+". Should be 0 to "+(s.Q-1)},
$S:0}
A.dV.prototype={
$0:function(){return"Parent tile of level "+(this.a.a+1)+" is missing for region "+this.b.h(0)},
$S:0}
A.dZ.prototype={
$0:function(){return"Bad channel number "+this.b+". Should be 0 to "+(this.a.cy-1)},
$S:0}
A.dT.prototype={
$0:function(){var s=this.a
return"getAlchemyByteBlockPointer: "+H.d(U.b1(s))+": "+H.d(U.J(s))},
$S:0}
A.dU.prototype={
$0:function(){var s=this.a
return"getAlchemyLowBytePointerForIsColorFlagsDC: "+H.d(U.b1(s))+": "+H.d(U.J(s))},
$S:0}
A.dS.prototype={
$0:function(){return"borrowRenderableAlchemyData:  data not available, at level "+this.a.a},
$S:0}
K.e4.prototype={}
K.e5.prototype={
D:function(a,b){var s=this.a.x
s[0]=a&255
s[1]=a>>>8&255
s[2]=a>>>16&255
s[3]=a>>>24&255
s[4]=b&255
s[5]=C.c.L(b,8)&255
s[6]=C.c.L(b,16)&255
s[7]=C.c.L(b,24)&255},
aw:function(a,b,c,d,e){var s,r
this.D(83950133,a)
s=this.a
r=s.x
r[8]=b&255
r[9]=b>>>8&255
r[10]=c&255
r[11]=c>>>8&255
r[12]=d&255
r[13]=d>>>8&255
r[14]=0
r[15]=0
e.A(s)}}
O.cx.prototype={
b7:function(a,b,c,d,e){var s,r=this
r.k1=a
r.k2=b
r.k3=c
r.r1=d
r.k4=e
s=c===10||c===12||c===11
if(d===1)if(!s)throw H.a(P.x("Images with ZSTD compression only support EVEN_ODD bitEncoding, not HIGH_BIT or other"))},
d_:function(a){var s,r,q,p,o=this,n=null,m=o.rx
if(m!=null&&!J.k(m[a],0))return o.rx[a]
m=o.r2
if(m!=null){m=m[a]
m=m==null||m.e<128}else m=!0
if(m){$.fQ().i(C.h,"Quantization table not set, or is wrong size",n,n)
return 0}if(o.rx==null){m=R.cG(o.k1)
o.rx=m
r=o.k1
for(q=0;q<r;++q)m[q]=0}try{o.rx[a]=Q.i1(o.r2[a],0,128)}catch(p){m=H.n(p)
if(t.k.b(m)){s=m
$.fQ().i(C.b,new O.e6(s),n,n)}else throw p}if(J.k(o.rx[a],0))$.fQ().i(C.b,"Problem creating memory for quantization table",n,n)
return o.rx[a]},
a1:function(a){var s=this.ry
if(s==null)return 1
return s[a]},
a2:function(a){var s=this.x1
if(s==null)return 1
return s[a]},
c1:function(){var s,r,q,p=this
if(p.ry==null){s=R.ad(p.k1)
p.ry=s
for(r=p.k1,q=0;q<r;++q)s[q]=1}return p.ry},
c2:function(){var s,r,q,p=this
if(p.x1==null){s=R.ad(p.k1)
p.x1=s
for(r=p.k1,q=0;q<r;++q)s[q]=1}return p.x1},
dh:function(){var s,r,q,p=this,o=p.rx
if(o!=null){s=o.length
for(o=t.l,r=0;r<s;++r)if(!J.k(p.rx[r],0)){q=H.f([p.rx[r]],o)
$.p().t("free",q)
p.rx[r]=0}p.rx=null}},
u:function(){var s,r,q,p,o=this
o.dh()
s=o.r2
if(s!=null){r=s.length
for(q=0;q<r;++q){p=s[q]
if(p!=null){J.cc(p)
s=o.r2
s[q]=null}}o.r2=null}o.ce()},
aa:function(a,b){var s,r,q,p,o,n,m,l,k,j,i,h,g,f=this,e=a.b,d=f.b,c=f.c
a.D(16841269,4294967295)
s=a.a
r=s.x
r[8]=d&255
r[9]=d>>>8&255
r[10]=d>>>16&255
r[11]=d>>>24&255
r[12]=c&255
r[13]=c>>>8&255
r[14]=c>>>16&255
r[15]=c>>>24&255
b.A(s)
c=f.k1
r=f.k2
d=f.k3
q=f.r1
p=f.k4
a.D(1090583093,0)
o=s.x
o[8]=c&255
o[9]=c>>>8&255
o[10]=r&255
o[11]=r>>>8&255
o[12]=d&255
o[13]=q&255
o[14]=p&255
o[15]=p>>>8&255
b.A(s)
if(e.e){if(f.r2!=null)for(n=0;n<f.k1;++n){d=f.r2[n]
if(d!=null){a.D(1107360309,d.e)
c=s.x
c[8]=0
c[9]=0
c[10]=1
c[11]=0
c[12]=n&255
c[13]=n>>>8&255
c[14]=0
c[15]=0
b.A(s)
b.A(d)}}if(f.ry!=null&&f.x1!=null)if(f.k1>1||f.a1(0)>1||f.a2(0)>1){d=f.k1
c=f.c1()
r=f.c2()
a.D(1124137525,0)
q=d>0
m=q?c[0]:1
l=q?r[0]:1
q=s.x
q[8]=m&255
q[9]=l&255
p=d>1
m=p?c[1]:1
l=p?r[1]:1
q[10]=m&255
q[11]=l&255
p=d>2
m=p?c[2]:1
l=p?r[2]:1
q[12]=m&255
q[13]=l&255
d=d>3
m=d?c[3]:1
l=d?r[3]:1
q[14]=m&255
q[15]=l&255
b.A(s)}}k=f.d
j=e.c
i=e.b
if(j>k)j=k
if(i>j)i=j
if(e.d)j=k
for(h=j;h>=i;--h){g=f.ai(h)
if(g!=null)g.aa(a,b)
else break}a.D(2164324917,0)
d=s.x
d[8]=0
d[9]=0
d[10]=0
d[11]=0
d[12]=0
d[13]=0
d[14]=0
d[15]=0
b.A(s)}}
O.e6.prototype={
$0:function(){var s=this.a
return"Error: "+H.d(U.b1(s))+", "+H.d(U.J(s))},
$S:0}
O.e7.prototype={
aZ:function(){var s=this.I
if(s!=null)return s
if(!this.at)return this.da
return null},
b2:function(){return this.by},
dH:function(a,b){var s,r,q,p=this.c
if(a===p){p.toString
if(b<0)H.t(P.bP("Illegal negative length= "+C.c.h(b)))
if(b===0){s=p.d
s=s>0?s:0}else{if(b>p.d)H.t(U.al(""))
s=b}r=H.b7(p.x.buffer,p.c,s)
p.c=p.c+s
p.d=p.d-s
return M.hG(r,0,0)}q=M.hF()
a.av(q,0,b)
return q},
dC:function(a){var s,r,q,p,o=this,n=!0,m=!1
n=J.k(n,!0)
m=J.k(m,!0)
if(o.at)return
try{o.c=null
s=a
if(s!=null){if(!o.bA&&n)a.sP(0,0)
if(m)o.c=a
o.dF(s)}}catch(q){p=H.n(q)
if(t.k.b(p)){r=p
$.F().i(C.b,new O.e8(r),null,null)
p=new B.cz()
p.cv(20013,!1,"Problem downloading image",U.J(r))
o.bz=p
o.at=!0}else throw q}},
dF:function(a){var s=this,r=s.bN(a)
s.bA=!0
for(;r;)r=s.dT(a)&&s.bN(a)},
a0:function(a){var s=Y.i(["Haar version ",a," is not supported."])
$.F().i(C.b,s,null,null)
throw H.a(E.K(s))},
m:function(a){$.F().i(C.b,a,null,null)
throw H.a(E.K(a))},
bN:function(a){var s,r,q=this
if(q.d!==5)return!0
s=q.y2-q.aN
if(s<=0)return!0
if(a.ga5()>=s){if(q.H==null)q.m("Haar Tile is NULL.  Internal parser error.")
if(q.r2)q.H.b6(q.r1,q.x2,q.rx,q.ry,q.x1,a,s)
else{r=q.dH(a,s)
q.H.b5(q.r1,q.x2,q.y1,r)}q.aN=q.y2=0
return!0}return!1},
dT:function(a){var s,r,q,p,o=this
if(a.ga5()<16||o.e)return!1
a.av($.o(),0,16)
$.o().sP(0,0)
s=$.o().w()
if(s!==64053)o.m(Y.u("Haar tag Magic Number not found.  Instead found ",s))
r=$.o().w()
q=r&255
p=$.o().aT()
switch(r>>>8&255){case 1:o.dP(q,p)
break
case 129:if(o.d!==1)o.m("Image Endtag found in the wrong part of the image.")
o.d=0
o.e=!0
if(o.a)$.F().i(C.f,"Image Endtag.",null,null)
break
case 65:o.dO(q,p)
break
case 66:o.dQ(q,p,a)
break
case 67:o.dL(q,p)
break
case 130:o.dR(q,p)
break
case 2:o.dS(q,p)
break
case 132:o.dK(q,p)
break
case 4:o.dM(q,p)
break
case 13:o.dJ(q,p)
break
case 141:o.dI(q,p)
break
case 131:o.dU(q,p)
break
case 3:o.dV(q,p)
break
case 5:o.dN(q,p)
break
default:break}return!0},
dR:function(a,b){var s=this
if(s.d!==2)s.m("Resolution Endtag found in the wrong part of the image.")
s.d=1
if(s.a)$.F().i(C.f,new O.ei(s),null,null)},
dK:function(a,b){var s=this,r=s.d
if(r!==4&&r!==5)s.m("Channel Endtag found in the wrong part of the image.")
s.d=3
if(s.a)$.F().i(C.f,new O.eb(s),null,null)},
dI:function(a,b){var s=this,r=s.d
if(r!==4&&r!==5)s.m("Channel Decompressed Endtag found in the wrong part of the image.")
s.d=3
if(s.a)$.F().i(C.f,new O.e9(s),null,null)},
dU:function(a,b){var s,r=this,q=" at resolution level "
if(r.d!==3)r.m("Tile Endtag found in the wrong part of the image.")
r.d=2
s=r.H
if(s==null)r.m("Tile was NULL.  Internal parser error.")
else if(r.a6==null)r.m("Parsing error.  No resolution object found for tile.")
else{if(!s.ga8())r.m(Y.i(["Not all blocks found for tile ",r.go,",",r.k2,q,r.db]))
if(r.a6.c7(r.go,r.id,r.H)!==0)r.m(Y.i(["Error setting tile position ",r.go,",",r.k2,q,r.db]))}if(r.a)$.F().i(C.f,new O.ek(r),null,null)
r.H=null},
dN:function(a,b){var s,r,q=this
q.x2=$.o().w()
q.y1=$.o().w()
s=$.o().w()
if(q.a)$.F().i(C.f,new O.ee(q,b,s),null,null)
if(a!==0)q.a0(a)
r=q.r1
if(r!==s)q.m(Y.i(["Channel number ",s," of block must equal current Channel number ",r]))
q.y2=b
q.aN=0
q.d=5},
dM:function(a,b){var s,r=this,q=r.r2=!1
r.ry=r.rx=null
r.r1=$.o().w()
if(r.a)$.F().i(C.f,new O.ed(r),null,null)
if(a!==0)r.a0(a)
s=r.r1
if(s<0||s>r.x)r.m(Y.i(["ColorSpace supports channel 0 to ",r.x-1,", not ",s]))
s=r.d
if(s!==3?s!==4:q)r.m(u.p)
r.d=4},
dJ:function(a,b){var s,r,q,p=this,o=p.r2=!0
p.r1=$.o().w()
p.rx=A.je($.o().a_())
p.ry=E.jN($.o().a_())
p.x1=$.o().a_()
if(p.a){s=p.rx
r=s!=null?s.b:"null"
s=p.ry
q=s!=null?s.a:"null"
$.F().i(C.f,new O.ea(p,r,q),null,null)}if(a!==0)p.a0(a)
s=p.r1
if(s>=0?s>p.x:o)p.m(Y.i(["ColorSpace supports channel 0 to ",p.x-1,", not ",s]))
o=p.d
if(o!==3&&o!==4)p.m(u.p)
if(p.rx==null)p.m("ChannelDecompressedTypeEnum was an invalid value.")
if(p.rx.a===1&&p.ry==null)p.m("Channel Decompressed PixelSampleType was invalid.")
p.d=4},
aM:function(){},
dQ:function(a,b,c){var s,r,q,p=this,o=$.o().w()!==0,n=$.o().w()===0,m=$.o().w()
if(p.a)$.F().i(C.f,new O.eh(b,m,o,!n),null,null)
if(a!==0)p.a0(a)
if(o)p.m("Currently only supports uncompressed QTable")
if(n)p.m("Only support Natural Order QTable")
if(b!==128)p.m(Y.u("Uncompressed QTable length must be 128, not ",b))
n=p.z
if(n!==2&&n!==1&&n!==12&&n!==11)p.m(Y.u("QTable only supported for JPEG, not ",n))
n=p.x
if(m>=n)p.m(Y.i(["QTable channel ",m," is outside the range 0 to ",n]))
s=M.hF()
c.av(s,0,b)
p.aM()
if(p.I==null){n=p.z
r=n===1||n===11?0:3
n=O.hP(p.f,p.r,r,p.b2(),p.cx,!1)
p.I=n
n.b7(p.x,p.y,p.z,p.ch,p.Q)}n=p.I
q=n.r2;(q==null?n.r2=R.ae(n.k1,!1,t.A):q)[m]=s},
dL:function(a,b){var s,r,q,p,o=this,n={},m=R.ad(o.x),l=R.ad(o.x),k=o.x
if(k>4)o.m(Y.u("Channel subsampling only supports up to 4 color channels, not ",k))
s=o.x
for(r=0;r<s;++r){m[r]=$.o().a_()
l[r]=$.o().a_()}if(o.a){k=n.a="Channel Subsampling (col,row)"
for(q=0;q<s;++q,k=p){p=Q.jy(k,[", (",m[q],",",l[q],")"])
n.a=p}$.F().i(C.f,new O.ec(n),null,null)}o.aM()
k=o.I
k.ry=m
k.x1=l},
dV:function(a,b){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e=this
e.go=$.o().w()
e.id=$.o().w()
e.k1=$.o().w()
e.k2=$.o().w()
if(e.a)$.F().i(C.f,new O.el(e),null,null)
s=e.go
r=e.dx
s*=r
e.k3=s
q=e.id
p=e.dy
q*=p
e.k4=q
o=e.fr-s
r=o>r?r:o
n=e.fx-q
p=n>p?p:n
s=e.k1
if(s!==r)e.m(Y.i(["Calculated required tile width was ",r,", but found ",s]))
s=e.k2
if(s!==p)e.m(Y.i(["Calculated required tile height was ",p,", but found ",s]))
if(e.d!==2)e.m("Found Tile tag in the wrong place of the image.")
e.d=3
if(e.H!=null)e.m("Internal error.  Haar tile should be null for start of new tile")
m=new U.w(e.k3,e.k4,e.k1,e.k2,t.X)
l=e.fy!==0
s=e.a6
if(s==null)e.m("Custom file error.  Current resolution should exist when reading tile tag.")
else{k=s.c5(e.go,e.id)
e.H=k instanceof A.ab?k:null}if(e.H==null){s=e.z
switch(s){case 255:s=new S.eO()
s.K(e.db,m,e.go,e.id)
s.x=s.r=s.f=!1
e.H=s
break
case 0:case 10:s=e.db
q=e.go
j=e.id
i=e.I
h=i.k4===0?4:5
g=new F.bn()
g.K(s,m,q,j)
g.ba(s,m,q,j,l,h,1,i)
g.k3=K.hO(i.k3)
g.k2=g.ay()
e.H=g
break
case 2:case 1:case 12:case 11:f=s===1||s===11
s=e.db
q=e.go
j=e.id
i=e.I
h=Y.jl(l,i)
g=new Y.aZ()
g.K(s,m,q,j)
g.ba(s,m,q,j,l,h,0,i)
g.k4=f
g.r1=K.hO(i.k3)
g.k2=g.ay()
g.k3=R.ae(g.cy,!1,t.ba)
e.H=g
break
default:e.m(Y.u(u.c,s))}}},
dS:function(a,b){var s,r,q,p,o,n=this,m=$.o().w()
n.dx=$.o().w()
n.dy=$.o().w()
n.fy=$.o().w()
if(n.a)$.F().i(C.f,new O.ej(n,m),null,null)
if(a!==0)n.a0(a)
if(n.d!==1)n.m("Found Resolution tag in the middle of the image.")
s=n.db
if(m>=s)n.m(Y.i(["Resolution of ",m," not less than the previous ",s]))
if(!n.cy)n.m("No format tag was found before the Resolution Tag")
n.db=m
s=n.fr=n.f
r=n.fx=n.r
for(q=0;q<m;++q){s=C.a.k((s+1)/2)>>>0
n.fr=s
r=C.a.k((r+1)/2)>>>0
n.fx=r}if(n.dx===0)n.dx=s
if(n.dy===0)n.dy=r
n.d=2
n.aM()
if(n.I==null){s=O.hP(n.f,n.r,n.db,n.b2(),n.cx,!1)
n.I=s
s.b7(n.x,n.y,n.z,n.ch,n.Q)}p=n.fy!==0
o=n.I.ai(n.db)
if(o==null){s=new F.bx()
s.cs(n.db,n.fr,n.fx,p,n.cx)
n.a6=s
s.c9(n.dx,n.dy)
if(n.I.c8(n.db,n.a6)!==0)n.m(Y.i(["Problem setting resolution level ",n.db," into Haar Image"]))}else{n.a6=o
s=o.x
if(s!==p)n.m(Y.i(["The existing Resolution object in the hierarchy was DC=",s,", while we expected isDC=",p]))}},
dO:function(a,b){var s,r,q,p,o=this
o.x=$.o().w()
o.y=$.o().w()
o.z=$.o().a_()
o.ch=$.o().a_()
o.Q=$.o().w()
if(o.a)$.F().i(C.f,new O.ef(o),null,null)
if(a!==0)o.a0(a)
s=o.y
if(s>9)o.m(Y.u("Not a valid ColorSpace: ",s))
s=o.y
s=$.fN().n(0,s)
if(s==null)o.m(Y.u("Unknown ColorSpace: ",o.y))
r=o.y>0?s.dB():1
q=o.x
if(q!==r)o.m(Y.i(["Number of channels ",q,", does not match the colorspace ",s.b," channels of ",r]))
s=o.ch
if(s!==0&&s!==1&&s!==255)o.m(Y.u("only support compressionCodec ZLIB (0) and ZSTD_V8 (1), not ",s))
s=o.z
if(s!==0&&s!==2&&s!==1&&s!==10&&s!==12&&s!==11&&s!==255)o.m(Y.u(u.c,s))
s=o.z
q=s===255
if(q)o.cx="NONE"
else if(s===0||s===10)o.cx="CLHAAR"
else o.cx="CLJPEG"
p=o.ch===255
if(p||q)if(!p||!q)o.m("Expected transform type 255 for compression codec 255 and vice versa; instead parsed transform type "+s+" and compression codec "+o.ch)
if(o.cy)o.m("Cannot have two format tags in an image")
s=o.z
if(s===255){s=o.Q
if(s!==255)o.m("Expected transform sub-type 255 for transform type 255; instead parsed transform sub-type "+s)}else if(s===0||s===10){s=o.Q
if(!(s===0||s===2||s===1||s===4||s===3||s===5))o.m(Y.u("HAAR image does not have correct sub-type: ",s))}else{s=o.Q
if(s!==0&&s!==6)o.m(Y.u("JPEG image does not have correct sub-type: ",s))}o.cy=!0},
dP:function(a,b){var s,r,q=this
q.f=$.o().aT()
q.r=$.o().aT()
if(q.a)$.F().i(C.f,new O.eg(q,a),null,null)
if(a!==0)q.a0(a)
if(q.d!==0)q.m("Found image header tag in the middle of the image.")
s=q.f
if(s<=65536){r=q.r
r=r>65536||s===0||r===0}else r=!0
if(r)q.m(Y.i(["Unsupported size: ",s,"x",q.r]))
q.d=1}}
O.e8.prototype={
$0:function(){return U.J(this.a)},
$S:0}
O.ei.prototype={
$0:function(){return">Resolution Endtag "+this.a.db+"."},
$S:0}
O.eb.prototype={
$0:function(){return">>>Channel Endtag "+this.a.r1+"."},
$S:0}
O.e9.prototype={
$0:function(){return">>>Channel Decompressed Endtag "+this.a.r1+"."},
$S:0}
O.ek.prototype={
$0:function(){var s=this.a
return">>Tile Endtag: Column "+s.go+", Row "+s.id+"."},
$S:0}
O.ee.prototype={
$0:function(){var s=this.a
return">>>>Data Block: Number "+s.x2+", Length "+this.b+", IsHighByte "+s.y1+", Channel "+this.c+"."},
$S:0}
O.ed.prototype={
$0:function(){return">>>Channel "+this.a.r1+"."},
$S:0}
O.ea.prototype={
$0:function(){return">>>Channel Decompressed "+this.a.r1+": "+this.b+": "+this.c+"."},
$S:0}
O.eh.prototype={
$0:function(){var s=this
return Y.i(["Qtable: Size ",s.a,", channel ",s.b,", isCompressed ",s.c,", isNaturalOrder ",s.d])},
$S:2}
O.ec.prototype={
$0:function(){return this.a.a},
$S:0}
O.el.prototype={
$0:function(){var s=this.a
return">>Tile: Column "+s.go+", Row "+s.id+", Width "+s.k1+", Height "+s.k2+"."},
$S:0}
O.ej.prototype={
$0:function(){var s=this.a
return">Resolution Level "+this.b+", Tile Width "+s.dx+", Tile Height "+s.dy+", Is DC Level="+s.fy+"."},
$S:0}
O.ef.prototype={
$0:function(){var s=this.a
return"Format: Number of Channels "+s.x+", Colorspace "+s.y+", Transform Type "+s.z+", SubType "+s.Q+"."},
$S:0}
O.eg.prototype={
$0:function(){var s=this.a
return"Image Version "+this.b+", Width "+s.f+", Height "+s.r+"."},
$S:0}
E.cI.prototype={}
S.cJ.prototype={}
E.V.prototype={
ah:function(a,b){var s=this.gbs(),r=a*b,q=r*s
if(s===5)if(C.c.b3(r,2)!==0)return q+1
return q},
gbs:function(){var s=this.b
if(s===4)return 1
else if(s===5)return 2
else if(s===7)return 5
else if(s>=6)return 3
else return 4}}
G.cp.prototype={
b9:function(a,b){if(a<0)a=0
if(b<a)b=a
this.a=a
this.b=b}}
Z.eT.prototype={
gae:function(a){return"decompress"},
V:function(a,b){var s=new M.X()
s.T("Error",a.a,b)
s.as(this.c)
return s},
bg:function(){var s,r=this,q=r.a
if(q!=null){s=q.aZ()
if(s!=null)s.u()
r.a=null}q=r.b
if(q!=null){q.u()
r.b=null}r.c=null},
u:function(){this.bg()},
bx:function(a){var s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b=this
b.bg()
s=a.aX()
if(s==null||!1)return b.V(a,"No Image data stream")
r=b.c=s[0]
r.sP(0,0)
q=G.jf(a.d)
if(q==null)return b.V(a,"No decompress extra data in request")
p=q.d
o=new O.e7(300>=$.F().gaR().b,$.iR())
o.dc=o.by=p
if(p==null||p.length===0)H.t(P.x("unique key cannot be null or empty."))
b.a=o
o.b=!1
o.a=!1
b.a.dC(r)
p=b.a
if(p.at){n=p.bz
return b.V(a,n==null?"Bad Image stream for decompression.":Y.i([n.c," | ",n.d]))}m=p.aZ()
p=m instanceof O.cx?m:null
b.b=p
if(p==null)return b.V(a,"Parser failed to return an Image")
l=q.a
k=p.ai(l)
if(k==null)return b.V(a,Y.i(["Resolution ",l," not available for Image"]))
p=k.b
o=k.c
b.b.dE(l,new U.w(0,0,p,o,t.X),new U.bN(0,0,t.cx))
j=q.a
i=q.b
h=new L.dO()
if(j<0)j=0
if(i<j)i=j
h.b=j
h.a=!0
h.d=!1
h.c=i
h.e=!1
g=new M.dN($.iQ())
g.b=h
r.sP(0,0)
b.b.aa(g,r)
f=r.c
e=new M.X()
e.T("Success",a.a,null)
e.as(b.c)
d=new G.cp()
d.b9(q.a,q.b)
d.c=f
d.d=q.d
r=t.z
c=P.cS(r,r)
c.q(0,"toLevel",d.a)
c.q(0,"fromLevel",d.b)
c.q(0,"streamLength",d.c)
c.q(0,"imageID",d.d)
e.d=C.y.d7(c)
return e}}
K.eU.prototype={
gae:function(a){return"fakeForTest"},
u:function(){this.a=null},
V:function(a,b){var s=new M.X()
s.T("Error",a.a,b)
s.as(this.a)
return s},
bx:function(a){var s,r,q,p=this
p.a=null
s=a.aX()
if(s==null||!1)return p.V(a,"No byte array")
r=s[0]
p.a=r
r.sP(0,0)
r=a.d
p.b=r
if(r==null)return p.V(a,"No extra String in request")
q=new M.X()
q.T("Success",a.a,null)
q.as(p.a)
q.d=p.b
return q}}
M.cg.prototype={
ct:function(a,b){var s,r=this,q=a.a
if(q==null)q=a.a=new M.cv(t.U.a(self))
r.a=q
r.c=q.a
r.dn(b)
q=r.a
s=r.gcF()
if(!q.cQ(s))q.cS(s)},
dn:function(a){var s,r
for(s=0;s<1;++s){r=a[s]
this.c.importScripts(r)}},
cG:function(a){var s
if(a.b==="Check")this.cg(a.a)
else if(!this.cf(a)){s=new M.X()
s.T("Error",a.a,"Not Implemented Yet")
this.a.bL(s)}}}
M.X.prototype={
T:function(a,b,c){this.b=a
this.a=b
if(c!=null&&c.length>0)this.e=c},
aX:function(){var s,r,q
if(this.c==null)return null
s=H.f([],t.o)
for(r=J.ce(this.c);r.B();){q=new M.a8(512,3)
q.cu(r.gC(),0,0)
s.push(q)}return s},
as:function(a){var s
if(a==null)this.c=null
else{s=[]
this.c=s
s.push(a.d9())}},
b1:function(){var s,r,q,p=this.c
if(p!=null){s=[]
for(p=J.ce(p),r=t.aa;p.B();){q=p.gC()
if(r.b(q))s.push(q.buffer)}if(s.length!==0)return s}return null},
bk:function(){var s=this,r=t.z,q=P.jF(["requestID",s.a,"messageType",s.b],r,r)
r=s.d
if(r!=null)q.q(0,"complex",r)
r=s.c
if(r!=null)q.q(0,"pingPongBuffers",r)
r=s.e
if(r!=null&&r.length>0)q.q(0,"errorMessage",r)
return q},
$ifW:1}
M.dQ.prototype={}
M.cv.prototype={
cQ:function(a){return!1},
cP:function(a){var s,r,q,p,o,n,m,l=null,k=J.j3(a)
if(this.b!=null){s=k!=null
if(s){r=J.av(k)
q=r.n(k,"messageType")
p=r.n(k,"requestID")}else{p=l
q=p}if(q==null){q="Error"
o="No messageType"}else o=l
n=new M.X()
n.T(q,p,l)
if(s){s=J.av(k)
m=s.n(k,"errorMessage")
n.c=s.n(k,"pingPongBuffers")
n.d=s.n(k,"complex")
if(o==null)o=m}n.e=o
this.b.$1(n)}},
cS:function(a){var s=this
if(s.b!=null)return!1
s.b=a
C.p.cB(s.a,"message",s.gcO(),null)
return!0},
bL:function(a){C.p.bM(this.a,a.bk(),a.b1())}}
U.bi.prototype={
cL:function(){if(this.d==null){var s=P.cS(t.O,t.aI)
this.d=s
s.q(0,"decompress",Z.k1())
this.d.q(0,"fakeForTest",K.k3())}},
bU:function(a){return this.d.n(0,a)},
bq:function(a){var s,r,q,p,o,n
for(s=this.e,r=Y.cF(s),q=r.length,p=0;p<r.length;r.length===q||(0,H.ay)(r),++p){o=r[p]
n=new M.X()
n.b="Alive"
n.a=o
o=this.a
C.p.bM(o.a,n.bk(),n.b1())}C.d.sl(s,0)},
bp:function(){return this.bq(null)},
d6:function(a,b){var s,r,q,p,o,n,m
if(b==null)return!1
s=null
r=""
try{r=b.gae(b)
s=b.bx(a)
b.u()}catch(o){n=H.n(o)
if(t.k.b(n)){q=n
p=Y.i(["Exception thrown in ",r," worker action.  Error is: ",U.J(q)])
m=new M.X()
m.T("Error",a.a,p)
s=m}else throw o}if(s==null){n=C.e.S("Null response in ",r)+" worker action"
m=new M.X()
m.T("Error",a.a,n)
s=m}n=s
this.a.bL(n)
return!0},
di:function(a){var s=this.bU(a.b)
if(s==null)return!1
return this.d6(a,s.$0())},
dk:function(a){this.e.push(a)
if($.p().t("registerCallbackIfNotInitialized",[this.gcT()]))this.bp()}}
Y.aH.prototype={
J:function(a,b){if(b==null)return!1
return b instanceof Y.aH&&this.b===b.b},
gv:function(a){return this.b},
h:function(a){return this.a}}
F.b5.prototype={
gbB:function(){var s=this.b,r=s==null||s.a==="",q=this.a
return r?q:s.gbB()+"."+q},
gaR:function(){var s,r
if(this.b==null)s=this.c
else{r=$.hv()
s=r.c}return s},
i:function(a,b,c,d){var s,r=a.b
if(r>=this.gaR().b){if(t.G.b(b))b=b.$0()
s=typeof b=="string"?b:J.az(b)
if(r>=2000){P.k_()
if(c==null){a.h(0)
H.d(s)}}this.gbB()
Date.now()
$.i0=$.i0+1
if(!(this.b==null)){r=$.hv()
r.toString}}}}
F.eD.prototype={
$0:function(){var s,r,q,p=this.a
if(C.e.cc(p,"."))H.t(P.x("name shouldn't start with a '.'"))
s=C.e.dw(p,".")
if(s===-1)r=p!==""?F.M(""):null
else{r=F.M(C.e.a4(p,0,s))
p=C.e.cd(p,s+1)}q=new F.b5(p,r,P.cS(t.O,t.e))
if(r==null)q.c=C.B
else r.d.q(0,p,q)
return q},
$S:25}
Q.eP.prototype={
c3:function(a){var s,r,q,p=this
if(a<=p.b&&p.a!==0)return p.a
s=p.a
if(s!==0){r=H.f([s],t.l)
$.p().t("free",r)
p.a=0
s=0}try{r=H.f([a],t.i)
s=p.a=$.p().t("alloc",r)
p.b=a}catch(q){if(t.k.b(H.n(q)))s=p.b=p.a=0
else throw q}return s},
c4:function(a){var s,r,q,p,o,n=a.length
for(s=0,r=0;r<n;++r)s+=a[r]
q=this.c3(s)
if(q===0)return null
p=P.h_(n,0,!1,t.cp)
for(r=0,o=0;r<n;++r){p[r]=q+o
o+=a[r]}return p}}
R.en.prototype={
h:function(a){return"Event [type="+this.a+", bubbles=false, cancelable=false]"}}
R.eo.prototype={
d5:function(a,b,c){return}}
R.ep.prototype={
h:function(a){return"EventPhase.AT_TARGET"}}
U.bN.prototype={
h:function(a){return"Point<"+H.hm(this.$ti.p("1*")).h(0)+"> [x="+this.a+", y="+this.b+"]"},
gl:function(a){var s=this.a,r=this.b
return Math.sqrt(s*s+r*r)},
J:function(a,b){if(b==null)return!1
return t.a3.b(b)&&this.a===b.a&&this.b===b.b},
gv:function(a){var s=C.c.gv(this.a),r=C.c.gv(this.b)
return O.hZ(O.bz(O.bz(0,s),r))},
$ii5:1}
U.w.prototype={
j:function(a){var s=this
return new U.w(s.a,s.b,s.c,s.d,s.$ti.p("w<1*>"))},
h:function(a){var s=this
return"Rectangle<"+H.hm(s.$ti.p("1*")).h(0)+"> [left="+H.d(s.a)+", top="+H.d(s.b)+", width="+H.d(s.c)+", height="+H.d(s.d)+"]"},
J:function(a,b){var s=this
if(b==null)return!1
return t.bd.b(b)&&s.a===b.a&&s.b===b.b&&s.c===b.c&&s.d===b.d},
gv:function(a){var s=this,r=C.a.gv(s.a),q=C.a.gv(s.b),p=C.a.gv(s.c),o=C.a.gv(s.d)
return O.hZ(O.bz(O.bz(O.bz(O.bz(0,r),q),p),o))},
bJ:function(a,b,c){this.a+=b
this.b+=c},
bC:function(a){var s=this,r=s.a,q=a.a,p=Math.max(r,q),o=s.b,n=a.b,m=Math.max(o,n)
return new U.w(p,m,Math.min(r+s.c,q+a.c)-p,Math.min(o+s.d,n+a.d)-m,s.$ti.p("w<1*>"))},
k:function(a){var s=this
return new U.w(C.a.k(s.a+0.49),C.a.k(s.b+0.49),C.a.k(s.c+0.49),C.a.k(s.d+0.49),t.a6)},
$ii6:1};(function aliases(){var s=J.L.prototype
s.ck=s.h
s.cj=s.au
s=J.an.prototype
s.cl=s.h
s=P.q.prototype
s.co=s.ab
s=P.m.prototype
s.cp=s.h
s=P.ag.prototype
s.cm=s.n
s.cn=s.q
s=P.bc.prototype
s.cq=s.q
s=L.cf.prototype
s.ce=s.u
s=A.ci.prototype
s.al=s.u
s=A.ab.prototype
s.ci=s.u
s=U.bi.prototype
s.cf=s.di
s.cg=s.dk})();(function installTearOffs(){var s=hunkHelpers._static_1,r=hunkHelpers._static_0,q=hunkHelpers._instance_1u,p=hunkHelpers.installInstanceTearOff
s(P,"kW","k6",6)
s(P,"kX","k7",6)
s(P,"kY","k8",6)
r(P,"iy","kR",1)
s(P,"l_","kv",3)
s(P,"lc","hc",26)
s(P,"lb","hb",27)
r(Z,"k1","k2",9)
r(K,"k3","k4",9)
q(M.cg.prototype,"gcF","cG",23)
q(M.cv.prototype,"gcO","cP",5)
p(U.bi.prototype,"gcT",0,0,function(){return[null]},["$1","$0"],["bq","bp"],24,0)})();(function inheritance(){var s=hunkHelpers.mixin,r=hunkHelpers.inherit,q=hunkHelpers.inheritMany
r(P.m,null)
q(P.m,[H.fY,J.L,J.bj,P.l,P.af,H.bD,H.bt,H.b9,P.bF,H.bo,H.ew,H.aB,H.eQ,H.eK,H.c0,H.fj,P.aL,H.eC,H.cR,H.a0,H.dj,H.dq,P.fp,P.cm,P.dh,P.dk,P.a1,P.dg,P.d9,P.fs,P.q,P.dt,P.cq,P.fh,P.b_,P.bQ,P.f2,P.er,P.G,P.dn,P.aq,P.fm,P.eW,P.ag,P.eJ,P.cC,B.cz,K.cK,Y.cL,S.aN,M.cg,B.dM,N.dP,K.cs,T.e3,R.en,F.ch,Y.dz,Y.eB,R.eo,Q.dx,K.e4,L.dO,Q.bk,V.co,A.bm,D.cr,E.V,G.cp,Z.eT,K.eU,M.X,M.dQ,M.cv,Y.aH,F.b5,Q.eP,R.ep,U.bN,U.w])
q(J.L,[J.ev,J.b4,J.an,J.r,J.aF,J.am,H.bI,H.z,W.cD,W.aA,W.e,W.em,W.bw,P.bC])
q(J.an,[J.d3,J.ar,J.a4])
r(J.ex,J.r)
q(J.aF,[J.by,J.cN])
q(P.l,[H.cQ,H.bL,P.dc,H.cO,H.de,H.d5,H.di,P.bB,P.cl,P.d1,P.a7,P.d0,P.df,P.dd,P.bS,P.cu,P.cy,U.bu])
r(H.bs,P.af)
q(H.bs,[H.aJ,H.aI])
q(H.aJ,[H.bT,H.ah,P.dm])
r(P.c4,P.bF)
r(P.bU,P.c4)
r(H.bp,P.bU)
r(H.bq,H.bo)
q(H.aB,[H.eL,H.da,H.fC,H.fD,H.fE,P.f_,P.eZ,P.f0,P.f1,P.fq,P.f3,P.fa,P.f6,P.f7,P.f8,P.f5,P.f9,P.f4,P.fd,P.fe,P.fc,P.fb,P.fw,P.fl,P.eG,P.fi,P.eI,P.fn,P.fo,P.eY,P.fu,P.fv,P.fx,P.fy,P.fz,P.fI,P.fJ,Q.eq,F.e_,F.e0,Y.e1,Y.e2,L.dA,L.dC,L.dD,L.dB,Q.dy,A.dJ,A.dI,A.dH,A.dG,A.dE,A.dF,A.dW,A.dX,A.dY,A.dV,A.dZ,A.dT,A.dU,A.dS,O.e6,O.e8,O.ei,O.eb,O.e9,O.ek,O.ee,O.ed,O.ea,O.eh,O.ec,O.el,O.ej,O.ef,O.eg,F.eD])
r(H.bM,P.dc)
q(H.da,[H.d8,H.aY])
r(P.bE,P.aL)
q(P.bE,[H.y,P.dl])
r(H.b6,H.z)
q(H.b6,[H.bX,H.bZ])
r(H.bY,H.bX)
r(H.aM,H.bY)
r(H.c_,H.bZ)
r(H.R,H.c_)
q(H.R,[H.cW,H.cX,H.cY,H.cZ,H.d_,H.bJ,H.bK])
r(H.c1,H.di)
r(P.bV,P.dh)
r(P.fk,P.fs)
r(P.cw,P.d9)
r(P.cP,P.bB)
r(P.ey,P.cq)
q(P.cw,[P.eA,P.ez])
r(P.fg,P.fh)
q(P.a7,[P.b8,P.cM])
q(W.cD,[W.v,W.a5,W.bH,W.bb])
q(W.v,[W.b,W.a3])
r(W.c,W.b)
q(W.c,[W.cj,W.ck,W.cH,W.d2,W.d6])
q(W.e,[W.cn,W.S,W.A,W.cU,W.cV])
q(W.S,[W.ct,W.db])
r(W.aD,W.a5)
q(W.A,[W.cE,W.d4])
r(W.b0,W.aA)
r(P.dp,P.fm)
r(P.eX,P.eW)
q(P.ag,[P.bA,P.bc])
r(P.aG,P.bc)
r(U.bi,M.cg)
r(L.eV,U.bi)
q(U.bu,[U.bv,U.cT,E.cI,S.cJ])
r(U.cB,U.bv)
r(M.a8,B.dM)
r(N.et,R.en)
q(Y.dz,[A.ab,A.ci,S.eO])
q(A.ab,[F.bn,Y.aZ])
r(L.cf,R.eo)
q(A.ci,[T.br,Y.aO])
r(R.es,L.cf)
r(F.bx,Q.dx)
r(L.eu,Y.aO)
q(K.e4,[K.e5,O.e7])
r(M.dN,K.e5)
r(O.cx,R.es)
s(H.bX,P.q)
s(H.bY,H.bt)
s(H.bZ,P.q)
s(H.c_,H.bt)
s(P.c4,P.dt)
s(P.bc,P.q)})()
var v={typeUniverse:{eC:new Map(),tR:{},eT:{},tPV:{},sEA:[]},mangledGlobalNames:{j:"int",a6:"double",Y:"num",H:"String",iz:"bool",G:"Null",B:"List"},mangledNames:{},getTypeFromName:getGlobalFromName,metadata:[],types:["H*()","~()","@()","@(@)","G(@)","~(@)","~(~())","G()","~(m?,m?)","hU*()","~(H,@)","@(@,H)","@(H)","G(~())","G(m,bR)","a1<@>(@)","~(ba,@)","~(@,@)","G(@,@)","@(@,@)","bA(@)","aG<@>(@)","ag(@)","~(fW*)","~([@])","b5*()","m?(m?)","m?(@)"],interceptorsByTag:null,leafTags:null,arrayRti:typeof Symbol=="function"&&typeof Symbol()=="symbol"?Symbol("$ti"):"$ti"}
H.ko(v.typeUniverse,JSON.parse('{"d3":"an","ar":"an","a4":"an","lt":"e","ln":"b","lW":"b","m7":"b","lu":"c","m2":"c","lX":"v","lU":"v","lV":"S","lo":"A","m6":"a5","lx":"a3","m8":"a3","m4":"aM","m3":"z","b4":{"G":[]},"an":{"hY":[]},"r":{"B":["1"]},"ex":{"r":["1"],"B":["1"]},"aF":{"a6":[],"Y":[]},"by":{"a6":[],"j":[],"Y":[]},"cN":{"a6":[],"Y":[]},"am":{"H":[]},"cQ":{"l":[]},"bL":{"l":[]},"bs":{"af":["1"]},"aJ":{"af":["1"]},"bT":{"aJ":["1"],"af":["1"]},"ah":{"aJ":["2"],"af":["2"]},"b9":{"ba":[]},"bp":{"bU":["1","2"],"a_":["1","2"]},"bo":{"a_":["1","2"]},"bq":{"a_":["1","2"]},"bM":{"l":[]},"cO":{"l":[]},"de":{"l":[]},"c0":{"bR":[]},"aB":{"b2":[]},"da":{"b2":[]},"d8":{"b2":[]},"aY":{"b2":[]},"d5":{"l":[]},"y":{"aL":["1","2"],"a_":["1","2"]},"aI":{"af":["1"]},"z":{"W":[]},"b6":{"Z":["1"],"z":[],"W":[]},"aM":{"q":["a6"],"Z":["a6"],"B":["a6"],"z":[],"W":[],"q.E":"a6"},"R":{"q":["j"],"Z":["j"],"B":["j"],"z":[],"W":[]},"cW":{"R":[],"q":["j"],"Z":["j"],"B":["j"],"z":[],"W":[],"q.E":"j"},"cX":{"R":[],"q":["j"],"Z":["j"],"B":["j"],"z":[],"W":[],"q.E":"j"},"cY":{"R":[],"q":["j"],"Z":["j"],"B":["j"],"z":[],"W":[],"q.E":"j"},"cZ":{"R":[],"q":["j"],"Z":["j"],"B":["j"],"z":[],"W":[],"q.E":"j"},"d_":{"R":[],"q":["j"],"Z":["j"],"B":["j"],"z":[],"W":[],"q.E":"j"},"bJ":{"R":[],"q":["j"],"Z":["j"],"B":["j"],"z":[],"W":[],"q.E":"j"},"bK":{"R":[],"q":["j"],"Z":["j"],"B":["j"],"z":[],"W":[],"q.E":"j"},"di":{"l":[]},"c1":{"l":[]},"a1":{"b3":["1"]},"cm":{"l":[]},"bV":{"dh":["1"]},"bE":{"aL":["1","2"],"a_":["1","2"]},"aL":{"a_":["1","2"]},"bF":{"a_":["1","2"]},"bU":{"a_":["1","2"]},"dl":{"aL":["H","@"],"a_":["H","@"]},"dm":{"aJ":["H"],"af":["H"]},"bB":{"l":[]},"cP":{"l":[]},"a6":{"Y":[]},"j":{"Y":[]},"cl":{"l":[]},"dc":{"l":[]},"d1":{"l":[]},"a7":{"l":[]},"b8":{"l":[]},"cM":{"l":[]},"d0":{"l":[]},"df":{"l":[]},"dd":{"l":[]},"bS":{"l":[]},"cu":{"l":[]},"bQ":{"l":[]},"cy":{"l":[]},"dn":{"bR":[]},"c":{"v":[]},"cj":{"v":[]},"ck":{"v":[]},"cn":{"e":[]},"a3":{"v":[]},"ct":{"e":[]},"aD":{"a5":[]},"b":{"v":[]},"A":{"e":[]},"cE":{"e":[]},"b0":{"aA":[]},"cH":{"v":[]},"cU":{"e":[]},"cV":{"e":[]},"d2":{"v":[]},"d4":{"e":[]},"d6":{"v":[]},"db":{"e":[]},"S":{"e":[]},"aG":{"q":["1"],"B":["1"],"q.E":"1"},"cB":{"l":[]},"bu":{"l":[]},"bv":{"l":[]},"cT":{"l":[]},"bn":{"ab":[]},"aZ":{"ab":[]},"bx":{"hT":[]},"cI":{"l":[]},"cJ":{"l":[]},"X":{"fW":[]},"bN":{"i5":["1*"]},"w":{"i6":["1*"]}}'))
H.kn(v.typeUniverse,JSON.parse('{"bj":1,"bs":1,"bD":1,"bt":1,"bo":2,"cR":1,"b6":1,"d9":2,"bE":2,"dt":2,"bF":2,"c4":2,"cq":2,"cw":2,"bc":1,"cL":2,"aN":2}'))
var u={p:"Found Channel tag in the wrong place of the image.",c:"Only support transformType of 0, 1, and 2 (Haar, Sequantial JPEG, and Progressive JPEG), not ",f:"Parent tile is not a Haar tile for current level "}
var t=(function rtii(){var s=H.c9
return{d:s("aA"),a:s("bp<ba,@>"),U:s("aD"),C:s("l"),D:s("e"),L:s("b0"),Z:s("b2"),c:s("b3<@>"),p:s("cK<@,@>"),I:s("bw"),s:s("r<H>"),b:s("r<@>"),H:s("r<bk*>"),o:s("r<a8*>"),W:s("r<co*>"),M:s("r<m*>"),V:s("r<H*>"),n:s("r<iz*>"),m:s("r<a6*>"),i:s("r<j*>"),l:s("r<Y*>"),T:s("b4"),q:s("hY"),g:s("a4"),J:s("Z<@>"),r:s("aG<@>"),B:s("y<ba,@>"),w:s("y<@,aN<@,@>*>"),Y:s("y<@,j*>"),v:s("bC"),j:s("B<@>"),f:s("a_<@,@>"),x:s("bH"),aE:s("bI"),cu:s("R"),t:s("z"),a1:s("v"),P:s("G"),K:s("m"),cx:s("bN<Y*>"),a6:s("w<j*>"),X:s("w<Y*>"),N:s("H"),h:s("W"),cr:s("ar"),cg:s("bb"),bj:s("a5"),y:s("iz"),cb:s("a6"),z:s("@"),b6:s("@(m)"),R:s("@(m,bR)"),S:s("j"),ba:s("ch*"),A:s("a8*"),ct:s("ab*"),cz:s("aZ*"),E:s("br*"),k:s("l*"),G:s("b2*"),cQ:s("jA*"),a0:s("lY*"),u:s("hT*"),cM:s("bx*"),cc:s("B<jA*>*"),e:s("b5*"),F:s("0&*"),_:s("m*"),a3:s("i5<Y>*"),bd:s("i6<Y>*"),O:s("H*"),aa:s("W*"),aI:s("hU*()*"),cp:s("Y*"),bc:s("b3<G>?"),Q:s("m?"),cY:s("Y")}})();(function constants(){var s=hunkHelpers.makeConstList
C.p=W.aD.prototype
C.S=J.L.prototype
C.d=J.r.prototype
C.c=J.by.prototype
C.T=J.b4.prototype
C.a=J.aF.prototype
C.e=J.am.prototype
C.U=J.a4.prototype
C.k=H.bK.prototype
C.I=J.d3.prototype
C.u=J.ar.prototype
C.v=new P.cC()
C.m=new P.cC()
C.w=function getTagFallback(o) {
  var s = Object.prototype.toString.call(o);
  return s.substring(8, s.length - 1);
}
C.J=function() {
  var toStringFunction = Object.prototype.toString;
  function getTag(o) {
    var s = toStringFunction.call(o);
    return s.substring(8, s.length - 1);
  }
  function getUnknownTag(object, tag) {
    if (/^HTML[A-Z].*Element$/.test(tag)) {
      var name = toStringFunction.call(object);
      if (name == "[object Object]") return null;
      return "HTMLElement";
    }
  }
  function getUnknownTagGenericBrowser(object, tag) {
    if (self.HTMLElement && object instanceof HTMLElement) return "HTMLElement";
    return getUnknownTag(object, tag);
  }
  function prototypeForTag(tag) {
    if (typeof window == "undefined") return null;
    if (typeof window[tag] == "undefined") return null;
    var constructor = window[tag];
    if (typeof constructor != "function") return null;
    return constructor.prototype;
  }
  function discriminator(tag) { return null; }
  var isBrowser = typeof navigator == "object";
  return {
    getTag: getTag,
    getUnknownTag: isBrowser ? getUnknownTagGenericBrowser : getUnknownTag,
    prototypeForTag: prototypeForTag,
    discriminator: discriminator };
}
C.O=function(getTagFallback) {
  return function(hooks) {
    if (typeof navigator != "object") return hooks;
    var ua = navigator.userAgent;
    if (ua.indexOf("DumpRenderTree") >= 0) return hooks;
    if (ua.indexOf("Chrome") >= 0) {
      function confirm(p) {
        return typeof window == "object" && window[p] && window[p].name == p;
      }
      if (confirm("Window") && confirm("HTMLElement")) return hooks;
    }
    hooks.getTag = getTagFallback;
  };
}
C.K=function(hooks) {
  if (typeof dartExperimentalFixupGetTag != "function") return hooks;
  hooks.getTag = dartExperimentalFixupGetTag(hooks.getTag);
}
C.L=function(hooks) {
  var getTag = hooks.getTag;
  var prototypeForTag = hooks.prototypeForTag;
  function getTagFixed(o) {
    var tag = getTag(o);
    if (tag == "Document") {
      if (!!o.xmlVersion) return "!Document";
      return "!HTMLDocument";
    }
    return tag;
  }
  function prototypeForTagFixed(tag) {
    if (tag == "Document") return null;
    return prototypeForTag(tag);
  }
  hooks.getTag = getTagFixed;
  hooks.prototypeForTag = prototypeForTagFixed;
}
C.N=function(hooks) {
  var userAgent = typeof navigator == "object" ? navigator.userAgent : "";
  if (userAgent.indexOf("Firefox") == -1) return hooks;
  var getTag = hooks.getTag;
  var quickMap = {
    "BeforeUnloadEvent": "Event",
    "DataTransfer": "Clipboard",
    "GeoGeolocation": "Geolocation",
    "Location": "!Location",
    "WorkerMessageEvent": "MessageEvent",
    "XMLDocument": "!Document"};
  function getTagFirefox(o) {
    var tag = getTag(o);
    return quickMap[tag] || tag;
  }
  hooks.getTag = getTagFirefox;
}
C.M=function(hooks) {
  var userAgent = typeof navigator == "object" ? navigator.userAgent : "";
  if (userAgent.indexOf("Trident/") == -1) return hooks;
  var getTag = hooks.getTag;
  var quickMap = {
    "BeforeUnloadEvent": "Event",
    "DataTransfer": "Clipboard",
    "HTMLDDElement": "HTMLElement",
    "HTMLDTElement": "HTMLElement",
    "HTMLPhraseElement": "HTMLElement",
    "Position": "Geoposition"
  };
  function getTagIE(o) {
    var tag = getTag(o);
    var newTag = quickMap[tag];
    if (newTag) return newTag;
    if (tag == "Object") {
      if (window.DataView && (o instanceof window.DataView)) return "DataView";
    }
    return tag;
  }
  function prototypeForTagIE(tag) {
    var constructor = window[tag];
    if (constructor == null) return null;
    return constructor.prototype;
  }
  hooks.getTag = getTagIE;
  hooks.prototypeForTag = prototypeForTagIE;
}
C.x=function(hooks) { return hooks; }

C.y=new P.ey()
C.z=new H.fj()
C.i=new P.fk()
C.P=new P.dn()
C.Q=new A.bm(0,"SinglePlane")
C.o=new A.bm(1,"AllPlanes")
C.A=new A.bm(2,"IsColorPlanes")
C.R=new R.ep()
C.V=new P.ez(null)
C.W=new P.eA(null)
C.f=new Y.aH("FINEST",300)
C.B=new Y.aH("INFO",800)
C.b=new Y.aH("SEVERE",1000)
C.h=new Y.aH("WARNING",900)
C.C=H.f(s([]),t.b)
C.X=H.f(s([]),H.c9("r<ba*>"))
C.D=new H.bq(0,{},C.X,H.c9("bq<ba*,@>"))
C.E=new E.V("ARGB_COLOR_INT",1)
C.q=new E.V("GRAY16_IN_ARGB",3)
C.n=new E.V("GRAY16_NATIVE_SHORTS",5)
C.F=new E.V("GRAY8_IN_ARGB",2)
C.j=new E.V("GRAY8_NATIVE_BYTES",4)
C.G=new E.V("RGB_COLOR_INT",0)
C.l=new E.V("RGB_COLOR_SEPARATE",6)
C.r=new E.V("YBR_FULL_COLOR_SEPARATE",8)
C.t=new E.V("YBR_PARTIAL_COLOR_SEPARATE",9)
C.H=new E.V("YBR_RCT_COLOR_SEPARATE",7)
C.Y=new H.b9("call")})();(function staticFields(){$.ff=null
$.a9=0
$.bl=null
$.hD=null
$.iB=null
$.ix=null
$.iH=null
$.fB=null
$.fF=null
$.hn=null
$.bd=null
$.c6=null
$.c7=null
$.hg=!1
$.D=C.i
$.aR=H.f([],H.c9("r<m>"))
$.jm=H.f([48,12,3,1],t.i)
$.jn=H.f([32,24,6,2],t.i)
$.jo=H.f([0,48,12,4],t.i)
$.hL=H.f([8,4,2,1],t.i)
$.j7=H.f(["packages/lookupextensions/LookupWrapperWorkerJSW.js?lv=3.1"],t.V)
$.i0=0
$.jG=P.cS(t.O,t.e)
$.ia=null
$.h1=null
$.eE=null})();(function lazyInitializers(){var s=hunkHelpers.lazyFinal,r=hunkHelpers.lazy,q=hunkHelpers.lazyOld
s($,"lS","fR",function(){return H.iA("_$dart_dartClosure")})
s($,"m9","iS",function(){return H.ai(H.eR({
toString:function(){return"$receiver$"}}))})
s($,"ma","iT",function(){return H.ai(H.eR({$method$:null,
toString:function(){return"$receiver$"}}))})
s($,"mb","iU",function(){return H.ai(H.eR(null))})
s($,"mc","iV",function(){return H.ai(function(){var $argumentsExpr$="$arguments$"
try{null.$method$($argumentsExpr$)}catch(p){return p.message}}())})
s($,"mf","iY",function(){return H.ai(H.eR(void 0))})
s($,"mg","iZ",function(){return H.ai(function(){var $argumentsExpr$="$arguments$"
try{(void 0).$method$($argumentsExpr$)}catch(p){return p.message}}())})
s($,"me","iX",function(){return H.ai(H.ib(null))})
s($,"md","iW",function(){return H.ai(function(){try{null.$method$}catch(p){return p.message}}())})
s($,"mi","j0",function(){return H.ai(H.ib(void 0))})
s($,"mh","j_",function(){return H.ai(function(){try{(void 0).$method$}catch(p){return p.message}}())})
s($,"mj","hw",function(){return P.k5()})
r($,"mC","j2",function(){return new Error().stack!=void 0})
s($,"mz","j1",function(){return P.iw(self)})
s($,"mk","hx",function(){return H.iA("_$dart_dartObject")})
s($,"mA","hy",function(){return function DartObject(a){this.o=a}})
q($,"lT","iR",function(){return B.js(0,!1,"","")})
q($,"lw","iL",function(){return N.hC(0)})
q($,"lv","iK",function(){return N.hC(1)})
q($,"ly","dw",function(){return K.aa(0,"_GRAYSCALE_COLORISERROR",null)})
q($,"lz","fK",function(){return K.aa(1,"RGB",null)})
q($,"lA","hq",function(){return K.aa(2,"RGBA",null)})
q($,"lE","fL",function(){return K.aa(3,"YBR_FULL",null)})
q($,"lG","fM",function(){return K.aa(4,"YBR_PARTIAL",null)})
q($,"lF","iN",function(){return K.aa(5,"YBR_ICT",null)})
q($,"lH","ht",function(){return K.aa(6,"YBR_RCT",null)})
q($,"lD","hs",function(){return K.aa(7,"YBRA_RCT",null)})
q($,"lB","iM",function(){return K.aa(8,"UNKNOWN_3PLANE",null)})
q($,"lC","hr",function(){return K.aa(9,"UNKNOWN_4PLANE",null)})
q($,"lI","fN",function(){var p=H.jE(H.c9("j*"),H.c9("cs*")),o=$.dw()
p.q(0,o.a,o)
o=$.fK()
p.q(0,o.a,o)
o=$.hq()
p.q(0,o.a,o)
o=$.fL()
p.q(0,o.a,o)
o=$.fM()
p.q(0,o.a,o)
o=$.iN()
p.q(0,o.a,o)
o=$.ht()
p.q(0,o.a,o)
o=$.hs()
p.q(0,o.a,o)
o=$.iM()
p.q(0,o.a,o)
o=$.hr()
p.q(0,o.a,o)
return p})
q($,"lM","iO",function(){return T.hM(0)})
q($,"lN","iP",function(){return T.hM(1)})
q($,"lK","fO",function(){return F.M("eunity.image.compressed.CompressedHaarTileData")})
q($,"lL","fP",function(){return F.M("eunity.image.compressed.CompressedJpeg12TileData")})
q($,"lr","cb",function(){return F.M("eunity.image.impl.AbstractImage")})
q($,"lp","aV",function(){return F.M("eunity.image.impl.AbstractImageResolution")})
q($,"lq","hp",function(){return F.M("eunity.image.impl.AbstractImageTile")})
q($,"ls","bh",function(){return F.M("eunity.image.impl.AlchemyImageTile")})
q($,"m_","hu",function(){return F.M("eunity.image.impl.Image")})
q($,"lZ","fS",function(){return F.M("eunity.image.impl.ImageResolution")})
q($,"m5","a2",function(){return F.M("image.impl.RenderableBitmapDataImageTile")})
q($,"lJ","I",function(){return F.M("eunity.image.parse.CompressedBaseTileData")})
q($,"lO","iQ",function(){return K.hN()})
q($,"lP","fQ",function(){return F.M("eunity.image.parse.CustomImage")})
q($,"lQ","F",function(){return F.M("eunity.image.parse.CustomParser")})
q($,"lR","o",function(){return K.hN()})
q($,"m0","hv",function(){return F.M("")})
q($,"m1","p",function(){return J.h($.j1().n(0,"EunityLookup"),"Module")})})();(function nativeSupport(){!function(){var s=function(a){var m={}
m[a]=1
return Object.keys(hunkHelpers.convertToFastObject(m))[0]}
v.getIsolateTag=function(a){return s("___dart_"+a+v.isolateTag)}
var r="___dart_isolate_tags_"
var q=Object[r]||(Object[r]=Object.create(null))
var p="_ZxYxX"
for(var o=0;;o++){var n=s(p+"_"+o+"_")
if(!(n in q)){q[n]=1
v.isolateTag=n
break}}v.dispatchPropertyName=v.getIsolateTag("dispatch_record")}()
hunkHelpers.setOrUpdateInterceptorsByTag({DOMError:J.L,MediaError:J.L,Navigator:J.L,NavigatorConcurrentHardware:J.L,NavigatorUserMediaError:J.L,OverconstrainedError:J.L,PositionError:J.L,PushMessageData:J.L,SQLError:J.L,ArrayBuffer:H.bI,DataView:H.z,ArrayBufferView:H.z,Float32Array:H.aM,Float64Array:H.aM,Int16Array:H.cW,Int32Array:H.cX,Int8Array:H.cY,Uint16Array:H.cZ,Uint32Array:H.d_,Uint8ClampedArray:H.bJ,CanvasPixelArray:H.bJ,Uint8Array:H.bK,HTMLAudioElement:W.c,HTMLBRElement:W.c,HTMLBaseElement:W.c,HTMLBodyElement:W.c,HTMLButtonElement:W.c,HTMLCanvasElement:W.c,HTMLContentElement:W.c,HTMLDListElement:W.c,HTMLDataElement:W.c,HTMLDataListElement:W.c,HTMLDetailsElement:W.c,HTMLDialogElement:W.c,HTMLDivElement:W.c,HTMLEmbedElement:W.c,HTMLFieldSetElement:W.c,HTMLHRElement:W.c,HTMLHeadElement:W.c,HTMLHeadingElement:W.c,HTMLHtmlElement:W.c,HTMLIFrameElement:W.c,HTMLImageElement:W.c,HTMLInputElement:W.c,HTMLLIElement:W.c,HTMLLabelElement:W.c,HTMLLegendElement:W.c,HTMLLinkElement:W.c,HTMLMapElement:W.c,HTMLMediaElement:W.c,HTMLMenuElement:W.c,HTMLMetaElement:W.c,HTMLMeterElement:W.c,HTMLModElement:W.c,HTMLOListElement:W.c,HTMLOptGroupElement:W.c,HTMLOptionElement:W.c,HTMLOutputElement:W.c,HTMLParagraphElement:W.c,HTMLParamElement:W.c,HTMLPictureElement:W.c,HTMLPreElement:W.c,HTMLProgressElement:W.c,HTMLQuoteElement:W.c,HTMLScriptElement:W.c,HTMLShadowElement:W.c,HTMLSlotElement:W.c,HTMLSourceElement:W.c,HTMLSpanElement:W.c,HTMLStyleElement:W.c,HTMLTableCaptionElement:W.c,HTMLTableCellElement:W.c,HTMLTableDataCellElement:W.c,HTMLTableHeaderCellElement:W.c,HTMLTableColElement:W.c,HTMLTableElement:W.c,HTMLTableRowElement:W.c,HTMLTableSectionElement:W.c,HTMLTemplateElement:W.c,HTMLTextAreaElement:W.c,HTMLTimeElement:W.c,HTMLTitleElement:W.c,HTMLTrackElement:W.c,HTMLUListElement:W.c,HTMLUnknownElement:W.c,HTMLVideoElement:W.c,HTMLDirectoryElement:W.c,HTMLFontElement:W.c,HTMLFrameElement:W.c,HTMLFrameSetElement:W.c,HTMLMarqueeElement:W.c,HTMLElement:W.c,HTMLAnchorElement:W.cj,HTMLAreaElement:W.ck,Blob:W.aA,BlobEvent:W.cn,CDATASection:W.a3,CharacterData:W.a3,Comment:W.a3,ProcessingInstruction:W.a3,Text:W.a3,CompositionEvent:W.ct,DedicatedWorkerGlobalScope:W.aD,DOMException:W.em,SVGAElement:W.b,SVGAnimateElement:W.b,SVGAnimateMotionElement:W.b,SVGAnimateTransformElement:W.b,SVGAnimationElement:W.b,SVGCircleElement:W.b,SVGClipPathElement:W.b,SVGDefsElement:W.b,SVGDescElement:W.b,SVGDiscardElement:W.b,SVGEllipseElement:W.b,SVGFEBlendElement:W.b,SVGFEColorMatrixElement:W.b,SVGFEComponentTransferElement:W.b,SVGFECompositeElement:W.b,SVGFEConvolveMatrixElement:W.b,SVGFEDiffuseLightingElement:W.b,SVGFEDisplacementMapElement:W.b,SVGFEDistantLightElement:W.b,SVGFEFloodElement:W.b,SVGFEFuncAElement:W.b,SVGFEFuncBElement:W.b,SVGFEFuncGElement:W.b,SVGFEFuncRElement:W.b,SVGFEGaussianBlurElement:W.b,SVGFEImageElement:W.b,SVGFEMergeElement:W.b,SVGFEMergeNodeElement:W.b,SVGFEMorphologyElement:W.b,SVGFEOffsetElement:W.b,SVGFEPointLightElement:W.b,SVGFESpecularLightingElement:W.b,SVGFESpotLightElement:W.b,SVGFETileElement:W.b,SVGFETurbulenceElement:W.b,SVGFilterElement:W.b,SVGForeignObjectElement:W.b,SVGGElement:W.b,SVGGeometryElement:W.b,SVGGraphicsElement:W.b,SVGImageElement:W.b,SVGLineElement:W.b,SVGLinearGradientElement:W.b,SVGMarkerElement:W.b,SVGMaskElement:W.b,SVGMetadataElement:W.b,SVGPathElement:W.b,SVGPatternElement:W.b,SVGPolygonElement:W.b,SVGPolylineElement:W.b,SVGRadialGradientElement:W.b,SVGRectElement:W.b,SVGScriptElement:W.b,SVGSetElement:W.b,SVGStopElement:W.b,SVGStyleElement:W.b,SVGElement:W.b,SVGSVGElement:W.b,SVGSwitchElement:W.b,SVGSymbolElement:W.b,SVGTSpanElement:W.b,SVGTextContentElement:W.b,SVGTextElement:W.b,SVGTextPathElement:W.b,SVGTextPositioningElement:W.b,SVGTitleElement:W.b,SVGUseElement:W.b,SVGViewElement:W.b,SVGGradientElement:W.b,SVGComponentTransferFunctionElement:W.b,SVGFEDropShadowElement:W.b,SVGMPathElement:W.b,Element:W.b,AnimationEvent:W.e,AnimationPlaybackEvent:W.e,ApplicationCacheErrorEvent:W.e,BeforeInstallPromptEvent:W.e,BeforeUnloadEvent:W.e,ClipboardEvent:W.e,CloseEvent:W.e,CustomEvent:W.e,DeviceMotionEvent:W.e,DeviceOrientationEvent:W.e,ErrorEvent:W.e,FontFaceSetLoadEvent:W.e,GamepadEvent:W.e,HashChangeEvent:W.e,MediaEncryptedEvent:W.e,MediaKeyMessageEvent:W.e,MediaQueryListEvent:W.e,MediaStreamEvent:W.e,MediaStreamTrackEvent:W.e,MIDIConnectionEvent:W.e,MutationEvent:W.e,PageTransitionEvent:W.e,PaymentRequestUpdateEvent:W.e,PopStateEvent:W.e,PresentationConnectionAvailableEvent:W.e,PresentationConnectionCloseEvent:W.e,ProgressEvent:W.e,PromiseRejectionEvent:W.e,RTCDataChannelEvent:W.e,RTCDTMFToneChangeEvent:W.e,RTCPeerConnectionIceEvent:W.e,RTCTrackEvent:W.e,SecurityPolicyViolationEvent:W.e,SensorErrorEvent:W.e,SpeechRecognitionError:W.e,SpeechRecognitionEvent:W.e,SpeechSynthesisEvent:W.e,StorageEvent:W.e,TrackEvent:W.e,TransitionEvent:W.e,WebKitTransitionEvent:W.e,VRDeviceEvent:W.e,VRDisplayEvent:W.e,VRSessionEvent:W.e,MojoInterfaceRequestEvent:W.e,ResourceProgressEvent:W.e,USBConnectionEvent:W.e,IDBVersionChangeEvent:W.e,AudioProcessingEvent:W.e,OfflineAudioCompletionEvent:W.e,WebGLContextEvent:W.e,Event:W.e,InputEvent:W.e,SubmitEvent:W.e,EventTarget:W.cD,AbortPaymentEvent:W.A,BackgroundFetchClickEvent:W.A,BackgroundFetchEvent:W.A,BackgroundFetchFailEvent:W.A,BackgroundFetchedEvent:W.A,CanMakePaymentEvent:W.A,FetchEvent:W.A,ForeignFetchEvent:W.A,InstallEvent:W.A,NotificationEvent:W.A,PaymentRequestEvent:W.A,SyncEvent:W.A,ExtendableEvent:W.A,ExtendableMessageEvent:W.cE,File:W.b0,HTMLFormElement:W.cH,ImageData:W.bw,MessageEvent:W.cU,MessagePort:W.bH,MIDIMessageEvent:W.cV,Document:W.v,DocumentFragment:W.v,HTMLDocument:W.v,ShadowRoot:W.v,XMLDocument:W.v,Attr:W.v,DocumentType:W.v,Node:W.v,HTMLObjectElement:W.d2,PushEvent:W.d4,HTMLSelectElement:W.d6,TextEvent:W.db,FocusEvent:W.S,KeyboardEvent:W.S,MouseEvent:W.S,DragEvent:W.S,PointerEvent:W.S,TouchEvent:W.S,WheelEvent:W.S,UIEvent:W.S,Window:W.bb,DOMWindow:W.bb,ServiceWorkerGlobalScope:W.a5,SharedWorkerGlobalScope:W.a5,WorkerGlobalScope:W.a5,IDBKeyRange:P.bC})
hunkHelpers.setOrUpdateLeafTags({DOMError:true,MediaError:true,Navigator:true,NavigatorConcurrentHardware:true,NavigatorUserMediaError:true,OverconstrainedError:true,PositionError:true,PushMessageData:true,SQLError:true,ArrayBuffer:true,DataView:true,ArrayBufferView:false,Float32Array:true,Float64Array:true,Int16Array:true,Int32Array:true,Int8Array:true,Uint16Array:true,Uint32Array:true,Uint8ClampedArray:true,CanvasPixelArray:true,Uint8Array:false,HTMLAudioElement:true,HTMLBRElement:true,HTMLBaseElement:true,HTMLBodyElement:true,HTMLButtonElement:true,HTMLCanvasElement:true,HTMLContentElement:true,HTMLDListElement:true,HTMLDataElement:true,HTMLDataListElement:true,HTMLDetailsElement:true,HTMLDialogElement:true,HTMLDivElement:true,HTMLEmbedElement:true,HTMLFieldSetElement:true,HTMLHRElement:true,HTMLHeadElement:true,HTMLHeadingElement:true,HTMLHtmlElement:true,HTMLIFrameElement:true,HTMLImageElement:true,HTMLInputElement:true,HTMLLIElement:true,HTMLLabelElement:true,HTMLLegendElement:true,HTMLLinkElement:true,HTMLMapElement:true,HTMLMediaElement:true,HTMLMenuElement:true,HTMLMetaElement:true,HTMLMeterElement:true,HTMLModElement:true,HTMLOListElement:true,HTMLOptGroupElement:true,HTMLOptionElement:true,HTMLOutputElement:true,HTMLParagraphElement:true,HTMLParamElement:true,HTMLPictureElement:true,HTMLPreElement:true,HTMLProgressElement:true,HTMLQuoteElement:true,HTMLScriptElement:true,HTMLShadowElement:true,HTMLSlotElement:true,HTMLSourceElement:true,HTMLSpanElement:true,HTMLStyleElement:true,HTMLTableCaptionElement:true,HTMLTableCellElement:true,HTMLTableDataCellElement:true,HTMLTableHeaderCellElement:true,HTMLTableColElement:true,HTMLTableElement:true,HTMLTableRowElement:true,HTMLTableSectionElement:true,HTMLTemplateElement:true,HTMLTextAreaElement:true,HTMLTimeElement:true,HTMLTitleElement:true,HTMLTrackElement:true,HTMLUListElement:true,HTMLUnknownElement:true,HTMLVideoElement:true,HTMLDirectoryElement:true,HTMLFontElement:true,HTMLFrameElement:true,HTMLFrameSetElement:true,HTMLMarqueeElement:true,HTMLElement:false,HTMLAnchorElement:true,HTMLAreaElement:true,Blob:false,BlobEvent:true,CDATASection:true,CharacterData:true,Comment:true,ProcessingInstruction:true,Text:true,CompositionEvent:true,DedicatedWorkerGlobalScope:true,DOMException:true,SVGAElement:true,SVGAnimateElement:true,SVGAnimateMotionElement:true,SVGAnimateTransformElement:true,SVGAnimationElement:true,SVGCircleElement:true,SVGClipPathElement:true,SVGDefsElement:true,SVGDescElement:true,SVGDiscardElement:true,SVGEllipseElement:true,SVGFEBlendElement:true,SVGFEColorMatrixElement:true,SVGFEComponentTransferElement:true,SVGFECompositeElement:true,SVGFEConvolveMatrixElement:true,SVGFEDiffuseLightingElement:true,SVGFEDisplacementMapElement:true,SVGFEDistantLightElement:true,SVGFEFloodElement:true,SVGFEFuncAElement:true,SVGFEFuncBElement:true,SVGFEFuncGElement:true,SVGFEFuncRElement:true,SVGFEGaussianBlurElement:true,SVGFEImageElement:true,SVGFEMergeElement:true,SVGFEMergeNodeElement:true,SVGFEMorphologyElement:true,SVGFEOffsetElement:true,SVGFEPointLightElement:true,SVGFESpecularLightingElement:true,SVGFESpotLightElement:true,SVGFETileElement:true,SVGFETurbulenceElement:true,SVGFilterElement:true,SVGForeignObjectElement:true,SVGGElement:true,SVGGeometryElement:true,SVGGraphicsElement:true,SVGImageElement:true,SVGLineElement:true,SVGLinearGradientElement:true,SVGMarkerElement:true,SVGMaskElement:true,SVGMetadataElement:true,SVGPathElement:true,SVGPatternElement:true,SVGPolygonElement:true,SVGPolylineElement:true,SVGRadialGradientElement:true,SVGRectElement:true,SVGScriptElement:true,SVGSetElement:true,SVGStopElement:true,SVGStyleElement:true,SVGElement:true,SVGSVGElement:true,SVGSwitchElement:true,SVGSymbolElement:true,SVGTSpanElement:true,SVGTextContentElement:true,SVGTextElement:true,SVGTextPathElement:true,SVGTextPositioningElement:true,SVGTitleElement:true,SVGUseElement:true,SVGViewElement:true,SVGGradientElement:true,SVGComponentTransferFunctionElement:true,SVGFEDropShadowElement:true,SVGMPathElement:true,Element:false,AnimationEvent:true,AnimationPlaybackEvent:true,ApplicationCacheErrorEvent:true,BeforeInstallPromptEvent:true,BeforeUnloadEvent:true,ClipboardEvent:true,CloseEvent:true,CustomEvent:true,DeviceMotionEvent:true,DeviceOrientationEvent:true,ErrorEvent:true,FontFaceSetLoadEvent:true,GamepadEvent:true,HashChangeEvent:true,MediaEncryptedEvent:true,MediaKeyMessageEvent:true,MediaQueryListEvent:true,MediaStreamEvent:true,MediaStreamTrackEvent:true,MIDIConnectionEvent:true,MutationEvent:true,PageTransitionEvent:true,PaymentRequestUpdateEvent:true,PopStateEvent:true,PresentationConnectionAvailableEvent:true,PresentationConnectionCloseEvent:true,ProgressEvent:true,PromiseRejectionEvent:true,RTCDataChannelEvent:true,RTCDTMFToneChangeEvent:true,RTCPeerConnectionIceEvent:true,RTCTrackEvent:true,SecurityPolicyViolationEvent:true,SensorErrorEvent:true,SpeechRecognitionError:true,SpeechRecognitionEvent:true,SpeechSynthesisEvent:true,StorageEvent:true,TrackEvent:true,TransitionEvent:true,WebKitTransitionEvent:true,VRDeviceEvent:true,VRDisplayEvent:true,VRSessionEvent:true,MojoInterfaceRequestEvent:true,ResourceProgressEvent:true,USBConnectionEvent:true,IDBVersionChangeEvent:true,AudioProcessingEvent:true,OfflineAudioCompletionEvent:true,WebGLContextEvent:true,Event:false,InputEvent:false,SubmitEvent:false,EventTarget:false,AbortPaymentEvent:true,BackgroundFetchClickEvent:true,BackgroundFetchEvent:true,BackgroundFetchFailEvent:true,BackgroundFetchedEvent:true,CanMakePaymentEvent:true,FetchEvent:true,ForeignFetchEvent:true,InstallEvent:true,NotificationEvent:true,PaymentRequestEvent:true,SyncEvent:true,ExtendableEvent:false,ExtendableMessageEvent:true,File:true,HTMLFormElement:true,ImageData:true,MessageEvent:true,MessagePort:true,MIDIMessageEvent:true,Document:true,DocumentFragment:true,HTMLDocument:true,ShadowRoot:true,XMLDocument:true,Attr:true,DocumentType:true,Node:false,HTMLObjectElement:true,PushEvent:true,HTMLSelectElement:true,TextEvent:true,FocusEvent:true,KeyboardEvent:true,MouseEvent:true,DragEvent:true,PointerEvent:true,TouchEvent:true,WheelEvent:true,UIEvent:false,Window:true,DOMWindow:true,ServiceWorkerGlobalScope:true,SharedWorkerGlobalScope:true,WorkerGlobalScope:false,IDBKeyRange:true})
H.b6.$nativeSuperclassTag="ArrayBufferView"
H.bX.$nativeSuperclassTag="ArrayBufferView"
H.bY.$nativeSuperclassTag="ArrayBufferView"
H.aM.$nativeSuperclassTag="ArrayBufferView"
H.bZ.$nativeSuperclassTag="ArrayBufferView"
H.c_.$nativeSuperclassTag="ArrayBufferView"
H.R.$nativeSuperclassTag="ArrayBufferView"})()
Function.prototype.$1=function(a){return this(a)}
Function.prototype.$0=function(){return this()}
Function.prototype.$2=function(a,b){return this(a,b)}
Function.prototype.$3=function(a,b,c){return this(a,b,c)}
Function.prototype.$1$1=function(a){return this(a)}
Function.prototype.$7=function(a,b,c,d,e,f,g){return this(a,b,c,d,e,f,g)}
Function.prototype.$4=function(a,b,c,d){return this(a,b,c,d)}
convertAllToFastObject(w)
convertToFastObject($);(function(a){if(typeof document==="undefined"){a(null)
return}if(typeof document.currentScript!="undefined"){a(document.currentScript)
return}var s=document.scripts
function onLoad(b){for(var q=0;q<s.length;++q)s[q].removeEventListener("load",onLoad,false)
a(b.target)}for(var r=0;r<s.length;++r)s[r].addEventListener("load",onLoad,false)})(function(a){v.currentScript=a
var s=S.le
if(typeof dartMainRunner==="function")dartMainRunner(s,[])
else s([])})})()
//# sourceMappingURL=eunity_viewer_worker_wasm.dart.js.map
