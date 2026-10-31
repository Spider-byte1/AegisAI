"use client";

import { useEffect, useRef, useState } from "react";


interface Props {
  logs: string[];
}


export default function SOCTerminal({ logs }: Props) {


const [displayLines, setDisplayLines] =
useState<string[]>([]);


const [currentText, setCurrentText] =
useState<string>("");


const terminalRef =
useRef<HTMLDivElement>(null);



const playBeep = () => {

try {

const audio =
new Audio("/terminal-beep.mp3");

audio.volume = 0.15;

audio.play();

}

catch(err){

console.log(err);

}

};





useEffect(()=>{


const latest =
logs.at(-1);


if(!latest)
return;



let index = 0;


setCurrentText("");



const typing =
setInterval(()=>{


if(index < latest.length){


setCurrentText(
prev => prev + latest[index]
);



if(index % 3 === 0){

playBeep();

}


index++;


}

else{


clearInterval(typing);



setDisplayLines(prev=>[

...prev,

latest

]);



setCurrentText("");

}


},40);



return ()=>clearInterval(typing);



},[logs]);







useEffect(()=>{


if(terminalRef.current){

terminalRef.current.scrollTop =
terminalRef.current.scrollHeight;

}


},[displayLines,currentText]);






return (

<section className="
mt-10
bg-black
border
border-green-500/40
rounded-3xl
p-6
shadow-[0_0_40px_rgba(34,197,94,0.15)]
">


<div className="
flex
justify-between
items-center
mb-5
">


<h2 className="
text-green-400
font-mono
text-xl
font-bold
">

⚡ LIVE SOC TERMINAL

</h2>



<div className="
flex gap-2
">

<span className="
w-3 h-3 rounded-full bg-red-500
"/>

<span className="
w-3 h-3 rounded-full bg-yellow-400
"/>

<span className="
w-3 h-3 rounded-full bg-green-500
"/>

</div>


</div>






<div

ref={terminalRef}

className="
h-72
overflow-y-auto
bg-black
rounded-xl
p-5
font-mono
text-sm
text-green-400
border
border-green-900
"

>


{

displayLines.map((line,index)=>(

<p
key={index}
className="mb-2"
>

{line}

</p>

))

}



<p>

{currentText}

<span className="animate-pulse">
▋
</span>


</p>



</div>



</section>

);


}