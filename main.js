    
	
    document.getElementById("d_add_ilimit_btn").onclick = function(){
        var nameChip=document.getElementById("select_chip").options.selectedIndex;
        var numChip=document.getElementById("select_chip").value;
        var numChannel=document.getElementById("select_ch").value;
        var ilimit1=document.getElementById("i_limit1").value;
        //var ilimit=document.getElementById("i_limit1").name;
        var ilimit2=document.getElementById("i_limit2").value;
        var ilimit3=document.getElementById("i_limit3").value;
        var ilimit4=document.getElementById("i_limit4").value;
        var textareaText = $('#ilimitform').val();
        //var valChip= document.getElementById("select_chip").options[numChip].value;
        //console.log(nameChip, numChip, numChannel);
        //console.log(ilimit1,ilimit2,ilimit3,ilimit4);
        //console.log(ilimit);


        if ((numChannel==1) || (numChannel==2) || (numChannel==5) || (numChannel==6)){
        	$('#ilimitform').val(textareaText + nameChip + ' ' + numChannel +' '+ ilimit1+' '+ ilimit2+' '+'-'+' '+'-'+' '+'\n');
        } else {
        	$('#ilimitform').val(textareaText + nameChip + ' ' + numChannel +' '+ ilimit1+' '+ ilimit2+' '+ ilimit3+' '+ ilimit4+'\n');
        }
        
        return false;
    }

    document.getElementById("d_delete_ilimit_btn").onclick = function(){
    	var textElem=document.getElementById("ilimitform");
    	var textVal=textElem.value.split(/(\r\n|\n|\r)/g).filter(function(n){
    		return n.trim()
    	});
    	textVal.pop();
    	textElem.value = textVal.join('\r\n')+'\r\n';
    }

    document.getElementById("d_ilimitformdelete_btn").onclick = function(){
    	document.getElementById("ilimitform").value = "";
    }

    function getDAC_Chip(numChip){
        var dac_code;

        if (numChip == 1){ dac_code=parseInt('0',16);}
        if (numChip == 2){ dac_code=parseInt('20',16);}
        if (numChip == 3){ dac_code=parseInt('40',16);}
        if (numChip == 4){ dac_code=parseInt('60',16);}
        if (numChip == 5){ dac_code=parseInt('80',16);}
        if (numChip == 6){ dac_code=parseInt('A0',16);}
        return dac_code;

    }

    function getDAC_Channel(numChannel,ilimit){
    	var dac_code;

    	if ((numChannel == 1) && (ilimit == 2)){ dac_code=0;};

    	if ((numChannel == 1) && (ilimit == 1)){dac_code=1;};

    	if ((numChannel == 2) && (ilimit == 2)){dac_code=2;};

    	if ((numChannel == 2) && (ilimit == 1)){dac_code=3;};

    	if ((numChannel == 3) && (ilimit == 4)){dac_code=4;};

        if ((numChannel == 3) && (ilimit == 3)){ dac_code=5;};

        if ((numChannel == 3) && (ilimit == 2)){ dac_code=6;};

        if ((numChannel == 3) && (ilimit == 1)){ dac_code=7;};

        if ((numChannel == 4) && (ilimit == 4)){ dac_code=8;};

        if ((numChannel == 4) && (ilimit == 3)){ dac_code=9;};

        if ((numChannel == 4) && (ilimit == 2)){ dac_code=10;};

        if ((numChannel == 4) && (ilimit == 1)){ dac_code=11;};

        if ((numChannel == 5) && (ilimit == 2)){ dac_code=12;};

        if ((numChannel == 5) && (ilimit == 1)){ dac_code=13;};

        if ((numChannel == 6) && (ilimit == 2)){ dac_code=14;};

        if ((numChannel == 6) && (ilimit == 1)){ dac_code=15;};

        if ((numChannel == 7) && (ilimit == 4)){ dac_code=16;};

        if ((numChannel == 7) && (ilimit == 3)){ dac_code=17;};

        if ((numChannel == 7) && (ilimit == 2)){ dac_code=18;};

        if ((numChannel == 7) && (ilimit == 1)){ dac_code=19;};

        if ((numChannel == 8) && (ilimit == 4)){ dac_code=20;};

        if ((numChannel == 8) && (ilimit == 3)){ dac_code=21;};

        if ((numChannel == 8) && (ilimit == 2)){ dac_code=22;};

        if ((numChannel == 8) && (ilimit == 1)){ dac_code=23;};

        return dac_code;

    }

    document.getElementById("d_ilimit_a_write_btn").onclick = function(){
        /////Working with textarea
        var textElem=document.getElementById("ilimitform");
        var textNumber=textElem.value.split(/\r|\r\n|\n/).length;

        var textVal=textElem.value.split(/(.{1})/g);

        textVal = textVal.filter(function(x) {
            if ((x !== '\n') && (x !== ' ')) {
                return x;
            }
        });

        ///////Prepairing data
        var data_arr=[];
        var data_num=[];
        var dac_code_ch=[];
        var dac_code_chip=[];
        var dac_code_forcalc=[];

        var regData=[];
        var dataIn=[];

        for (var i=0; i<textNumber-1; i++){
            data_arr.push([]);
            data_arr[i].push(new Array(6));

            for (var j=0; j<6; j++){
                data_arr[i][j]=textVal[j+i*6];
            }
        }

        for (var i=0; i<textNumber-1; i++){
            data_num.push(data_arr[i][1]);
            dac_code_chip.push(getDAC_Chip(data_arr[i][0]));
        }

        for (var i=0; i<data_num.length; i++){
            if ((data_num[i]==1) || (data_num[i]==2) || (data_num[i]==5) || (data_num[i]==6)){
                dac_code_ch.push(getDAC_Channel(data_num[i], 2));
                dac_code_ch.push(getDAC_Channel(data_num[i], 1));
                for(var k=0; k<2;k++){
                    dac_code_forcalc.push(dac_code_chip[i]);
                }
            } else {
                dac_code_ch.push(getDAC_Channel(data_num[i], 4));
                dac_code_ch.push(getDAC_Channel(data_num[i], 3)); 
                dac_code_ch.push(getDAC_Channel(data_num[i], 2));
                dac_code_ch.push(getDAC_Channel(data_num[i], 1)); 
                for(var k=0; k<4;k++){
                    dac_code_forcalc.push(dac_code_chip[i]);
                }
            }

        }

        for (var i=0; i<dac_code_ch.length; i++){
            regData[i]=dac_code_ch[i]+dac_code_forcalc[i];
        }

        var data_new = data_arr.map(function(val){
            return val.slice(2);
        });

        for (i = 0; i < data_new.length; i++) {
            for (j = 0; j < data_new[i].length; j++) {
            dataIn.push(Number(data_new[i][j]));
            }
        }

        ///Send data
        var InLimitQuantity=regData.length+1;
        var formData = {};
        var formDataReady = [];

        for ( var i=0; i <= InLimitQuantity; i++){
            if (i == InLimitQuantity){
                formData["regNum"]= parseInt('0x' + 260);
                formData["dataIn"]= parseInt('0x' + 20);
                formDataReady.push(JSON.parse(JSON.stringify(formData)));   
            }
            else{
                formData["regNum"]=parseInt('0x' + 300);
                formData["dataIn"]=parseInt('0x' + regData[i]);
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]=parseInt('0x' + 301);
                formData["dataIn"]=parseInt('0x' + dataIn[i]);
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]=parseInt('0x'+260);
                formData["dataIn"]=parseInt('0x'+10);
                formDataReady.push(JSON.parse(JSON.stringify(formData)));
                }
        }
        
       

        ///Data checking
        console.log(textVal);
        console.log(data_arr);
        console.log(data_num);
        console.log(dac_code_ch);
        console.log(dac_code_chip);
        console.log(dac_code_forcalc);
        console.log(regData);
        console.log(data_new);
        console.log(dataIn);
        console.log(formDataReady);
    }