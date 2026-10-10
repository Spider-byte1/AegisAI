"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken, errorMessage, getToken } from "@/lib/api";
import AssistantWidget from "@/components/AssistantWidget";


interface ScanResult {

  scan:{
    target:string;
    status:string;
    risk:{
      score:number;
      level:string;
    };
  };

}


interface Scan {

  id:number;
  target:string;
  status:string;
  risk:
  |
  string
  |
  {
    score:number;
    level:string;
  }
  |
  null;

}



export default function Home(){
const router = useRouter();
const [authorized,setAuthorized] = useState(false);


const [stats,setStats] = useState({

 total_scans:0,
 high_risk:0,
 medium_risk:0,
 low_risk:0

});


const [target,setTarget] = useState("");

const [scans,setScans] = useState<Scan[]>([]);

const [result,setResult] =
useState<ScanResult|null>(null);


const [loading,setLoading] =
useState(false);


const [progress,setProgress] =
useState(0);


const [message,setMessage] =
useState("");


const [scanStatus,setScanStatus] =
useState("");





const loadHistory = async()=>{

try{

const res = await apiFetch(
"/history/"
);


const data = await res.json();


setScans(Array.isArray(data)?data:[]);


}

catch(err){

console.log(err);

}

};





const loadStats = async()=>{


try{


const res = await apiFetch(
"/dashboard/stats"
);


const data = await res.json();


setStats(data);


}

catch(err){

console.log(err);

}


};
const deleteScan = async(id:number)=>{

  try{

    const response = await apiFetch(
      `/history/${id}`,
      {
        method:"DELETE"
      }
    );


    const data = await response.json();


    console.log(data);


    loadHistory();

    loadStats();


  }
  catch(error){

    console.log(error);

  }

};




useEffect(()=>{
if(!getToken()){
router.replace("/login");
return;
}
loadHistory();
loadStats();
// eslint-disable-next-line react-hooks/exhaustive-deps
},[]);






const startScan = async()=>{


setLoading(true);

setProgress(0);

setMessage("Starting scan...");

setResult(null);



try{


const res = await apiFetch(

"/scanner/start",

{

method:"POST",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({target,authorized})


}

);



const data = await res.json();


console.log("START RESPONSE",data);
if(!res.ok){
setLoading(false);
setMessage(errorMessage(data,"Scan could not be started"));
return;
}



pollStatus(data.scan_id);



}

catch(err){


console.log(err);


setLoading(false);

setMessage(
"Scan start failed"
);


}


};






const loadResult = async(id:number)=>{


try{


const res = await apiFetch(

`/scanner/result/${id}`

);


const data = await res.json();


console.log(
"RESULT",
data
);


setResult(data);


}

catch(err){

console.log(err);

}


};






const pollStatus=(id:number)=>{


const interval=setInterval(async()=>{


try{


const res = await apiFetch(

`/scanner/status/${id}`

);


const data = await res.json();


console.log(
"STATUS",
data
);



setProgress(data.progress ?? 0);

setMessage(data.message ?? "");

setScanStatus(data.status ?? "");





if(
data.status?.toLowerCase()==="completed"
||
data.progress===100
){


clearInterval(interval);


setLoading(false);


setMessage(
"Scan completed"
);


loadResult(id);

loadHistory();

loadStats();


}






if(

data.status?.toLowerCase()
==="failed"

){


clearInterval(interval);

setLoading(false);


}



}

catch(err){


console.log(err);

clearInterval(interval);

setLoading(false);


}


},2000);



};


return (

<main className="min-h-screen bg-slate-950 text-white p-8">


{/* Header */}

<section>

<h1 className="text-5xl font-bold text-cyan-400">
AegisAI Dashboard
</h1>


<p className="mt-2 text-gray-400">
AI Powered Vulnerability Assessment Platform
</p>
<button
onClick={()=>{clearToken();router.replace("/login");}}
className="mt-4 text-sm text-gray-400 hover:text-white underline"
>
Log out
</button>

</section>



{/* Dashboard Stats */}

<section className="grid grid-cols-4 gap-6 mt-10">


<div className="bg-slate-900 p-6 rounded-xl">

<h2>Total Scans</h2>

<p className="text-3xl font-bold">
{stats.total_scans}
</p>

</div>



<div className="bg-slate-900 p-6 rounded-xl">

<h2>High Risk</h2>

<p className="text-3xl font-bold text-red-500">
{stats.high_risk}
</p>

</div>



<div className="bg-slate-900 p-6 rounded-xl">

<h2>Medium Risk</h2>

<p className="text-3xl font-bold text-yellow-400">
{stats.medium_risk}
</p>

</div>



<div className="bg-slate-900 p-6 rounded-xl">

<h2>Low Risk</h2>

<p className="text-3xl font-bold text-green-500">
{stats.low_risk}
</p>

</div>


</section>





{/* Scan Input */}

<section className="mt-8 flex gap-4">


<input

className="border border-cyan-500 bg-slate-900 p-3 rounded-lg w-96"

placeholder="Enter Target"

value={target}

onChange={(e)=>setTarget(e.target.value)}

/>



<button

onClick={startScan}
disabled={loading||!authorized||!target.trim()}
className="bg-cyan-600 hover:bg-cyan-700 px-6 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"

>

{
loading ? "Scanning..." : "Start Scan"
}

</button>


</section>
<label className="mt-3 flex items-center gap-2 text-sm text-gray-400">
<input
type="checkbox"
checked={authorized}
onChange={(e)=>setAuthorized(e.target.checked)}
/>
I own this target or have written permission to scan it
</label>





{/* Progress */}

{loading && (

<section className="mt-8 bg-slate-900 p-6 rounded-xl">


<p className="mb-3">
{message}
</p>



<div className="w-full bg-slate-800 h-3 rounded">


<div

className="bg-cyan-500 h-3 rounded"

style={{
width:`${progress}%`
}}

>

</div>


</div>



<p className="mt-3">

{progress}% - {scanStatus}

</p>


</section>

)}





{/* Result */}

{result && (

<section className="mt-10 bg-slate-900 p-6 rounded-xl">


<h2 className="text-2xl font-bold mb-5">
Scan Result
</h2>



<div className="grid grid-cols-3 gap-6">


<div>

<p className="text-gray-400">
Target
</p>


<p className="text-xl">
{result.scan.target}
</p>

</div>




<div>

<p className="text-gray-400">
Status
</p>


<p className="text-green-400">
{result.scan.status}
</p>

</div>




<div>

<p className="text-gray-400">
Risk
</p>


<p className="text-yellow-400">
{result.scan.risk.level}
</p>

</div>



</div>


</section>

)}






{/* History */}

<section className="mt-12">


<h2 className="text-2xl font-bold mb-5">
Recent Scans
</h2>



<table className="w-full bg-slate-900 rounded-xl">


<thead>

<tr className="border-b border-slate-700">


<th className="p-4 text-left">
Target
</th>


<th className="p-4 text-left">
Status
</th>


<th className="p-4 text-left">
Risk
</th>


<th className="p-4 text-left">
Date
</th>


</tr>

</thead>




<tbody>


{
scans.map((scan)=>{


let riskLevel="";



if(typeof scan.risk==="string"){

try{

const obj=JSON.parse(
scan.risk.replace(/'/g,'"')
);

riskLevel=obj.level || scan.risk;


}

catch{

riskLevel=scan.risk;

}


}

else{

riskLevel=scan.risk?.level || "UNKNOWN";

}



return (

<tr

key={scan.id}

className="border-b border-slate-800"

>


<td className="p-4">

{scan.target}

</td>



<td>

{scan.status}

</td>



<td className="text-yellow-400">

{riskLevel}

</td>



<td>

Today

</td>
<td>

<button

onClick={()=>deleteScan(scan.id)}

className="bg-red-600 px-3 py-1 rounded"

>

Delete

</button>

</td>


</tr>


)


})

}


</tbody>



</table>


</section>



<AssistantWidget />
</main>

);
}