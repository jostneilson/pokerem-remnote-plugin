import type { ReactNode } from 'react';
export function Panel({title,icon,accent,children,collapsible=false,defaultOpen=false}:{
 title?:string;icon?:ReactNode;accent?:string;children:ReactNode;collapsible?:boolean;defaultOpen?:boolean;
}){
 const header=<>{icon?<span className="flex shrink-0 items-center">{icon}</span>:null}<span>{title}</span>{collapsible?<span className="pkr-disclosure-marker" aria-hidden="true">+</span>:null}</>;
 const style=accent?{borderColor:accent}:undefined;
 if(collapsible)return <details className="pkr-panel pkr-disclosure" style={style} open={defaultOpen||undefined}><summary className="pkr-panel-header">{header}</summary><div className="pkr-disclosure-body">{children}</div></details>;
 return <section className="pkr-panel" style={style}>{title?<div className="pkr-panel-header">{header}</div>:null}{children}</section>;
}
