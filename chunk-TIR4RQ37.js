import{a as Te,b as De}from"./chunk-Y5JFLJLE.js";import{a as Ce}from"./chunk-CH5CII3Z.js";import{a as Se}from"./chunk-AU2IXK4Q.js";import"./chunk-M7LFKQES.js";import{a as Ve}from"./chunk-ILRG4OEG.js";import"./chunk-S76LRAAH.js";import{c as A}from"./chunk-3YODDOSE.js";import"./chunk-L6TVR4FF.js";import{a as _e,c as ve,d as ye,g as we,m as Me,n as Ie}from"./chunk-6ADVACY4.js";import{B as ke,C as xe,H as fe,I as L,O as ge}from"./chunk-7NMDJ3VG.js";import{a as $e}from"./chunk-5IENNVY4.js";import"./chunk-H36WWVAR.js";import{c as be,e as me}from"./chunk-2FHQDTFS.js";import{$a as j,Aa as F,Ia as E,Ja as y,Ka as ie,M as Z,Mb as v,N as K,Na as C,Nb as de,O as X,Oa as h,Ob as J,Pa as s,Qa as oe,Sa as N,T as V,Ta as _,Ua as te,W as x,Wa as ne,X as Y,Xa as ce,Ya as a,Yb as pe,Za as c,_a as p,_b as he,a as $,ab as R,ac as ue,b as S,cb as M,cc as z,da as ee,db as I,ea as b,eb as u,fa as m,ga as T,ha as g,hb as Q,ib as ae,jb as B,kb as q,ma as D,mb as k,ob as P,sb as W,tb as H,ub as G,vb as re,wb as f,xb as le,yb as se,za as l}from"./chunk-5TFMM53R.js";var Fe=(()=>{class e extends A{static \u0275fac=(()=>{let i;return function(o){return(i||(i=g(e)))(o||e)}})();static \u0275cmp=x({type:e,selectors:[["CheckIcon"]],standalone:!0,features:[y,f],decls:2,vars:5,consts:[["width","14","height","14","viewBox","0 0 14 14","fill","none","xmlns","http://www.w3.org/2000/svg"],["d","M4.86199 11.5948C4.78717 11.5923 4.71366 11.5745 4.64596 11.5426C4.57826 11.5107 4.51779 11.4652 4.46827 11.4091L0.753985 7.69483C0.683167 7.64891 0.623706 7.58751 0.580092 7.51525C0.536478 7.44299 0.509851 7.36177 0.502221 7.27771C0.49459 7.19366 0.506156 7.10897 0.536046 7.03004C0.565935 6.95111 0.613367 6.88 0.674759 6.82208C0.736151 6.76416 0.8099 6.72095 0.890436 6.69571C0.970973 6.67046 1.05619 6.66385 1.13966 6.67635C1.22313 6.68886 1.30266 6.72017 1.37226 6.76792C1.44186 6.81567 1.4997 6.8786 1.54141 6.95197L4.86199 10.2503L12.6397 2.49483C12.7444 2.42694 12.8689 2.39617 12.9932 2.40745C13.1174 2.41873 13.2343 2.47141 13.3251 2.55705C13.4159 2.64268 13.4753 2.75632 13.4938 2.87973C13.5123 3.00315 13.4888 3.1292 13.4271 3.23768L5.2557 11.4091C5.20618 11.4652 5.14571 11.5107 5.07801 11.5426C5.01031 11.5745 4.9368 11.5923 4.86199 11.5948Z","fill","currentColor"]],template:function(t,o){t&1&&(T(),a(0,"svg",0),p(1,"path",1),c()),t&2&&(_(o.getClassNames()),h("aria-label",o.ariaLabel)("aria-hidden",o.ariaHidden)("role",o.role))},encapsulation:2})}return e})();var Ee=(()=>{class e extends A{static \u0275fac=(()=>{let i;return function(o){return(i||(i=g(e)))(o||e)}})();static \u0275cmp=x({type:e,selectors:[["MinusIcon"]],standalone:!0,features:[y,f],decls:2,vars:5,consts:[["width","14","height","14","viewBox","0 0 14 14","fill","none","xmlns","http://www.w3.org/2000/svg"],["d","M13.2222 7.77778H0.777778C0.571498 7.77778 0.373667 7.69584 0.227806 7.54998C0.0819442 7.40412 0 7.20629 0 7.00001C0 6.79373 0.0819442 6.5959 0.227806 6.45003C0.373667 6.30417 0.571498 6.22223 0.777778 6.22223H13.2222C13.4285 6.22223 13.6263 6.30417 13.7722 6.45003C13.9181 6.5959 14 6.79373 14 7.00001C14 7.20629 13.9181 7.40412 13.7722 7.54998C13.6263 7.69584 13.4285 7.77778 13.2222 7.77778Z","fill","currentColor"]],template:function(t,o){t&1&&(T(),a(0,"svg",0),p(1,"path",1),c()),t&2&&(_(o.getClassNames()),h("aria-label",o.ariaLabel)("aria-hidden",o.ariaHidden)("role",o.role))},encapsulation:2})}return e})();var ze=({dt:e})=>`
.p-checkbox {
    position: relative;
    display: inline-flex;
    user-select: none;
    vertical-align: bottom;
    width: ${e("checkbox.width")};
    height: ${e("checkbox.height")};
}

.p-checkbox-input {
    cursor: pointer;
    appearance: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    opacity: 0;
    z-index: 1;
    outline: 0 none;
    border: 1px solid transparent;
    border-radius: ${e("checkbox.border.radius")};
}

.p-checkbox-box {
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: ${e("checkbox.border.radius")};
    border: 1px solid ${e("checkbox.border.color")};
    background: ${e("checkbox.background")};
    width: ${e("checkbox.width")};
    height: ${e("checkbox.height")};
    transition: background ${e("checkbox.transition.duration")}, color ${e("checkbox.transition.duration")}, border-color ${e("checkbox.transition.duration")}, box-shadow ${e("checkbox.transition.duration")}, outline-color ${e("checkbox.transition.duration")};
    outline-color: transparent;
    box-shadow: ${e("checkbox.shadow")};
}

.p-checkbox-icon {
    transition-duration: ${e("checkbox.transition.duration")};
    color: ${e("checkbox.icon.color")};
    font-size: ${e("checkbox.icon.size")};
    width: ${e("checkbox.icon.size")};
    height: ${e("checkbox.icon.size")};
}

.p-checkbox:not(.p-disabled):has(.p-checkbox-input:hover) .p-checkbox-box {
    border-color: ${e("checkbox.hover.border.color")};
}

.p-checkbox-checked .p-checkbox-box {
    border-color: ${e("checkbox.checked.border.color")};
    background: ${e("checkbox.checked.background")};
}

.p-checkbox-checked .p-checkbox-icon {
    color: ${e("checkbox.icon.checked.color")};
}

.p-checkbox-checked:not(.p-disabled):has(.p-checkbox-input:hover) .p-checkbox-box {
    background: ${e("checkbox.checked.hover.background")};
    border-color: ${e("checkbox.checked.hover.border.color")};
}

.p-checkbox-checked:not(.p-disabled):has(.p-checkbox-input:hover) .p-checkbox-icon {
    color: ${e("checkbox.icon.checked.hover.color")};
}

.p-checkbox:not(.p-disabled):has(.p-checkbox-input:focus-visible) .p-checkbox-box {
    border-color: ${e("checkbox.focus.border.color")};
    box-shadow: ${e("checkbox.focus.ring.shadow")};
    outline: ${e("checkbox.focus.ring.width")} ${e("checkbox.focus.ring.style")} ${e("checkbox.focus.ring.color")};
    outline-offset: ${e("checkbox.focus.ring.offset")};
}

.p-checkbox-checked:not(.p-disabled):has(.p-checkbox-input:focus-visible) .p-checkbox-box {
    border-color: ${e("checkbox.checked.focus.border.color")};
}

.p-checkbox.ng-invalid.ng-dirty > .p-checkbox-box {
    border-color: ${e("checkbox.invalid.border.color")};
}

.p-checkbox.p-variant-filled .p-checkbox-box {
    background: ${e("checkbox.filled.background")};
}

.p-checkbox-checked.p-variant-filled .p-checkbox-box {
    background: ${e("checkbox.checked.background")};
}

.p-checkbox-checked.p-variant-filled:not(.p-disabled):has(.p-checkbox-input:hover) .p-checkbox-box {
    background: ${e("checkbox.checked.hover.background")};
}

.p-checkbox.p-disabled {
    opacity: 1;
}

.p-checkbox.p-disabled .p-checkbox-box {
    background: ${e("checkbox.disabled.background")};
    border-color: ${e("checkbox.checked.disabled.border.color")};
}

.p-checkbox.p-disabled .p-checkbox-box .p-checkbox-icon {
    color: ${e("checkbox.icon.disabled.color")};
}

.p-checkbox-sm,
.p-checkbox-sm .p-checkbox-box {
    width: ${e("checkbox.sm.width")};
    height: ${e("checkbox.sm.height")};
}

.p-checkbox-sm .p-checkbox-icon {
    font-size: ${e("checkbox.icon.sm.size")};
    width: ${e("checkbox.icon.sm.size")};
    height: ${e("checkbox.icon.sm.size")};
}

.p-checkbox-lg,
.p-checkbox-lg .p-checkbox-box {
    width: ${e("checkbox.lg.width")};
    height: ${e("checkbox.lg.height")};
}

.p-checkbox-lg .p-checkbox-icon {
    font-size: ${e("checkbox.icon.lg.size")};
    width: ${e("checkbox.icon.lg.size")};
    height: ${e("checkbox.icon.lg.size")};
}
`,Le={root:({instance:e,props:r})=>["p-checkbox p-component",{"p-checkbox-checked":e.checked,"p-disabled":r.disabled,"p-invalid":r.invalid,"p-variant-filled":r.variant?r.variant==="filled":e.config.inputStyle==="filled"||e.config.inputVariant==="filled"}],box:"p-checkbox-box",input:"p-checkbox-input",icon:"p-checkbox-icon"},Be=(()=>{class e extends ge{name="checkbox";theme=ze;classes=Le;static \u0275fac=(()=>{let i;return function(o){return(i||(i=g(e)))(o||e)}})();static \u0275prov=K({token:e,factory:e.\u0275fac})}return e})();var Ae=["checkboxicon"],Oe=["input"],Ne=()=>({"p-checkbox-input":!0}),je=e=>({checked:e,class:"p-checkbox-icon"});function Re(e,r){if(e&1&&p(0,"span",8),e&2){let i=u(3);s("ngClass",i.checkboxIcon),h("data-pc-section","icon")}}function Qe(e,r){e&1&&p(0,"CheckIcon",9),e&2&&(s("styleClass","p-checkbox-icon"),h("data-pc-section","icon"))}function Pe(e,r){if(e&1&&(j(0),C(1,Re,1,2,"span",7)(2,Qe,1,2,"CheckIcon",6),R()),e&2){let i=u(2);l(),s("ngIf",i.checkboxIcon),l(),s("ngIf",!i.checkboxIcon)}}function We(e,r){e&1&&p(0,"MinusIcon",9),e&2&&(s("styleClass","p-checkbox-icon"),h("data-pc-section","icon"))}function He(e,r){if(e&1&&(j(0),C(1,Pe,3,2,"ng-container",4)(2,We,1,2,"MinusIcon",6),R()),e&2){let i=u();l(),s("ngIf",i.checked),l(),s("ngIf",i._indeterminate())}}function Ge(e,r){}function Je(e,r){e&1&&C(0,Ge,0,0,"ng-template")}var Ue={provide:_e,useExisting:Z(()=>O),multi:!0},O=(()=>{class e extends Ie{value;name;disabled;binary;ariaLabelledBy;ariaLabel;tabindex;inputId;style;inputStyle;styleClass;inputClass;indeterminate=!1;size;formControl;checkboxIcon;readonly;required;autofocus;trueValue=!0;falseValue=!1;variant="outlined";onChange=new D;onFocus=new D;onBlur=new D;inputViewChild;get checked(){return this._indeterminate()?!1:this.binary?this.model===this.trueValue:xe(this.value,this.model)}get containerClass(){return{"p-checkbox p-component":!0,"p-checkbox-checked p-highlight":this.checked,"p-disabled":this.disabled,"p-variant-filled":this.variant==="filled"||this.config.inputStyle()==="filled"||this.config.inputVariant()==="filled","p-checkbox-sm p-inputfield-sm":this.size==="small","p-checkbox-lg p-inputfield-lg":this.size==="large"}}_indeterminate=E(void 0);checkboxIconTemplate;templates;_checkboxIconTemplate;model;onModelChange=()=>{};onModelTouched=()=>{};focused=!1;_componentStyle=V(Be);ngAfterContentInit(){this.templates.forEach(i=>{switch(i.getType()){case"icon":this._checkboxIconTemplate=i.template;break;case"checkboxicon":this._checkboxIconTemplate=i.template;break}})}ngOnChanges(i){super.ngOnChanges(i),i.indeterminate&&this._indeterminate.set(i.indeterminate.currentValue)}updateModel(i){let t,o=this.injector.get(ve,null,{optional:!0,self:!0}),n=o&&!this.formControl?o.value:this.model;this.binary?(t=this._indeterminate()?this.trueValue:this.checked?this.falseValue:this.trueValue,this.model=t,this.onModelChange(t)):(this.checked||this._indeterminate()?t=n.filter(d=>!ke(d,this.value)):t=n?[...n,this.value]:[this.value],this.onModelChange(t),this.model=t,this.formControl&&this.formControl.setValue(t)),this._indeterminate()&&this._indeterminate.set(!1),this.onChange.emit({checked:t,originalEvent:i})}handleChange(i){this.readonly||this.updateModel(i)}onInputFocus(i){this.focused=!0,this.onFocus.emit(i)}onInputBlur(i){this.focused=!1,this.onBlur.emit(i),this.onModelTouched()}focus(){this.inputViewChild.nativeElement.focus()}writeValue(i){this.model=i,this.cd.markForCheck()}registerOnChange(i){this.onModelChange=i}registerOnTouched(i){this.onModelTouched=i}setDisabledState(i){setTimeout(()=>{this.disabled=i,this.cd.markForCheck()})}static \u0275fac=(()=>{let i;return function(o){return(i||(i=g(e)))(o||e)}})();static \u0275cmp=x({type:e,selectors:[["p-checkbox"],["p-checkBox"],["p-check-box"]],contentQueries:function(t,o,n){if(t&1&&(Q(n,Ae,4),Q(n,fe,4)),t&2){let d;B(d=q())&&(o.checkboxIconTemplate=d.first),B(d=q())&&(o.templates=d)}},viewQuery:function(t,o){if(t&1&&ae(Oe,5),t&2){let n;B(n=q())&&(o.inputViewChild=n.first)}},inputs:{value:"value",name:"name",disabled:[2,"disabled","disabled",v],binary:[2,"binary","binary",v],ariaLabelledBy:"ariaLabelledBy",ariaLabel:"ariaLabel",tabindex:[2,"tabindex","tabindex",de],inputId:"inputId",style:"style",inputStyle:"inputStyle",styleClass:"styleClass",inputClass:"inputClass",indeterminate:[2,"indeterminate","indeterminate",v],size:"size",formControl:"formControl",checkboxIcon:"checkboxIcon",readonly:[2,"readonly","readonly",v],required:[2,"required","required",v],autofocus:[2,"autofocus","autofocus",v],trueValue:"trueValue",falseValue:"falseValue",variant:"variant"},outputs:{onChange:"onChange",onFocus:"onFocus",onBlur:"onBlur"},standalone:!0,features:[re([Ue,Be]),ie,y,ee,f],decls:6,vars:29,consts:[["input",""],[3,"ngClass"],["type","checkbox",3,"focus","blur","change","value","checked","disabled","readonly","ngClass"],[1,"p-checkbox-box"],[4,"ngIf"],[4,"ngTemplateOutlet","ngTemplateOutletContext"],[3,"styleClass",4,"ngIf"],["class","p-checkbox-icon",3,"ngClass",4,"ngIf"],[1,"p-checkbox-icon",3,"ngClass"],[3,"styleClass"]],template:function(t,o){if(t&1){let n=M();a(0,"div",1)(1,"input",2,0),I("focus",function(w){return b(n),m(o.onInputFocus(w))})("blur",function(w){return b(n),m(o.onInputBlur(w))})("change",function(w){return b(n),m(o.handleChange(w))}),c(),a(3,"div",3),C(4,He,3,2,"ng-container",4)(5,Je,1,0,null,5),c()()}t&2&&(N(o.style),_(o.styleClass),s("ngClass",o.containerClass),h("data-p-highlight",o.checked)("data-p-checked",o.checked)("data-p-disabled",o.disabled),l(),N(o.inputStyle),_(o.inputClass),s("value",o.value)("checked",o.checked)("disabled",o.disabled)("readonly",o.readonly)("ngClass",le(26,Ne)),h("id",o.inputId)("name",o.name)("tabindex",o.tabindex)("required",o.required)("aria-labelledby",o.ariaLabelledBy)("aria-label",o.ariaLabel),l(3),s("ngIf",!o.checkboxIconTemplate&&!o._checkboxIconTemplate),l(),s("ngTemplateOutlet",o.checkboxIconTemplate||o._checkboxIconTemplate)("ngTemplateOutletContext",se(27,je,o.checked)))},dependencies:[z,pe,he,ue,Fe,Ee,L],encapsulation:2,changeDetection:0})}return e})(),qe=(()=>{class e{static \u0275fac=function(t){return new(t||e)};static \u0275mod=Y({type:e});static \u0275inj=X({imports:[O,L,L]})}return e})();var Ke=(e,r)=>r.iso;function Xe(e,r){if(e&1){let i=M();a(0,"div",13),I("click",function(){let o=b(i).$implicit,n=u(2);return m(n.alternar(o.iso))}),k(1),c()}if(e&2){let i=r.$implicit;oe("background",i.ativo?"var(--color-accent)":"var(--color-bg)")("color",i.ativo?"var(--color-bg)":"var(--color-neutral-700)"),l(),P(" ",i.numero," ")}}function Ye(e,r){if(e&1){let i=M();p(0,"qp-back-button"),a(1,"div",0),k(2,"Ve\xEDculo"),c(),a(3,"h4",1),k(4),c(),a(5,"div",2),ne(6,Xe,2,5,"div",3,Ke),c(),a(8,"div",4)(9,"span",5),p(10,"span",6),k(11," Liberado"),c(),a(12,"span",5),p(13,"span",7),k(14," Bloqueado"),c()(),a(15,"div",8)(16,"label"),k(17,"Di\xE1ria do per\xEDodo (R$)"),c(),a(18,"p-inputnumber",9),G("ngModelChange",function(o){b(i);let n=u();return H(n.diaria,o)||(n.diaria=o),m(o)}),c()(),a(19,"label",10)(20,"p-checkbox",11),G("ngModelChange",function(o){b(i);let n=u();return H(n.aceiteAutomatico,o)||(n.aceiteAutomatico=o),m(o)}),c(),k(21," Aceite autom\xE1tico de reservas "),c(),a(22,"button",12),I("click",function(){let o=b(i),n=u();return m(n.salvar(o.id))}),k(23,"Salvar disponibilidade"),c()}if(e&2){let i=u();l(4),P("Disponibilidade \u2014 ",r.titulo,""),l(2),ce(i.dias()),l(12),W("ngModel",i.diaria),l(2),W("ngModel",i.aceiteAutomatico),s("binary",!0)}}var Oi=(()=>{class e{catalog;owner;router;route=V(be);paramMap=Ve(this.route.paramMap,{requireSync:!0});veiculo=J(()=>this.catalog.porId(this.paramMap().get("id")??""));disponibilidade=E({veiculoId:"",dias:{},aceiteAutomatico:!1});diaria=0;aceiteAutomatico=!1;dias=J(()=>Object.entries(this.disponibilidade().dias).map(([i,t])=>({iso:i,numero:Number(i.slice(-2)),ativo:t})));constructor(i,t,o){this.catalog=i,this.owner=t,this.router=o;let n=this.veiculo();if(n){let d=this.owner.disponibilidadeDoVeiculo(n.id);this.disponibilidade.set(d),this.diaria=n.diaria,this.aceiteAutomatico=d.aceiteAutomatico}}alternar(i){this.disponibilidade.update(t=>S($({},t),{dias:S($({},t.dias),{[i]:!t.dias[i]})}))}salvar(i){this.owner.salvarDisponibilidade(S($({},this.disponibilidade()),{veiculoId:i,aceiteAutomatico:this.aceiteAutomatico})),this.catalog.atualizar(i,{diaria:this.diaria}),this.router.navigate(["/proprietario/veiculos"])}static \u0275fac=function(t){return new(t||e)(F($e),F(Ce),F(me))};static \u0275cmp=x({type:e,selectors:[["qp-disponibilidade"]],standalone:!0,features:[f],decls:1,vars:1,consts:[[1,"qp-screen-kicker"],[1,"qp-screen-title"],[1,"qp-calendar",2,"margin-bottom","var(--space-2)"],[1,"qp-cal-day",3,"background","color"],[1,"qp-row",2,"gap","var(--space-4)","font-size","12px","margin-bottom","var(--space-4)"],[1,"qp-row",2,"gap","4px"],[1,"qp-legend",2,"background","var(--color-accent)"],[1,"qp-legend",2,"background","var(--color-bg)","border","1px solid var(--color-divider)"],[1,"field",2,"margin-bottom","var(--space-4)","max-width","220px"],["name","diaria","mode","currency","currency","BRL","locale","pt-BR",3,"ngModelChange","ngModel"],[1,"qp-row",2,"margin-bottom","var(--space-4)","cursor","pointer","gap","var(--space-2)"],["name","aceite",3,"ngModelChange","ngModel","binary"],[1,"btn","btn-primary",3,"click"],[1,"qp-cal-day",3,"click"]],template:function(t,o){if(t&1&&C(0,Ye,24,4),t&2){let n;te((n=o.veiculo())?0:-1,n)}},dependencies:[z,Me,ye,we,Se,De,Te,qe,O],styles:[".qp-legend[_ngcontent-%COMP%]{width:12px;height:12px;display:inline-block}"],changeDetection:0})}return e})();export{Oi as DisponibilidadeComponent};
