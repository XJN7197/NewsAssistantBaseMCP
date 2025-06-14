import React , { useState } from 'react';


const ToDo: React.FC = () => {
    const [listData, setListData] = useState<string[]>([]);
    const [inputData,setInputData] = useState('');

    const addList=()=>{
        setListData( [...listData,inputData]);
        setInputData('');
        console.log(listData);
    };

    const changeInput=(e)=>{
        console.log(e.target.value);
        setInputData(e.target.value);
    }
    console.log(listData)
  return (
    <div>
        <h1>To do list</h1>
        <div>
            <input onChange={changeInput} value={inputData}></input>
            <button onClick={addList}>增加</button>
        </div>
        <div>

        </div>
    </div>
  );
};

export default ToDo;