const triggerTickLen = 1000. / 120.; //ns

function getFormData(formId) {
    var uncheckedBoxes = $(formId + ' input[type=checkbox]:not(:checked)').map(
        function() {
            var obj = {};
            obj[this.name] = false;
            return obj;
        }).get();
    var checkedBoxes = $(formId + ' input[type=checkbox]:checked').map(
        function() {
            var obj = {};
            obj[this.name] = true;
            return obj;
        }).get();

    var rawFormData = $(formId).serializeArray();
    var otherFields = {};

    $.map(rawFormData, function(n, i) {
        if (n['value'].length > 0)
            otherFields[n['name']] = n['value'];
    });

    var formData = otherFields;
    for (var i = 0; i < uncheckedBoxes.length; i++)
        for (var key in uncheckedBoxes[i])
            formData[key] = uncheckedBoxes[i][key];

    for (var i = 0; i < checkedBoxes.length; i++)
        for (var key in checkedBoxes[i])
            formData[key] = checkedBoxes[i][key];

    return formData;
}

const tickLen = 6.25;

defaultChartLayout = {
    margin: {
        t: 40,
        l: 35,
        r: 15,
        b: 30
    },
    height: 700,
    dragmode: 'pan'
};
defaultChartConfig = {
    scrollZoom: true,
    displayModeBar: true,
    showLink: false,
    displaylogo: false,
    modeBarButtonsToRemove: ['sendDataToCloud']
};

function drawPlot(xValues, yValues, isChannel, num) {
    var chartStyle = $('#select_chart_type').find("option:selected").val();
    switch (chartStyle) {
        case 'line':
            var trace = {
                x: xValues,
                y: yValues,
                //type: 'bar',
                type: 'scatter',
                line: {
                    width: 2,
                    color: '#5391e2'
                }
            };
            var data = [trace];
            var layout = defaultChartLayout;
            layout['shapes'] = [];
            if (isChannel)
                layout['title'] = 'Канал: ' + (num + 1);
            else
                layout['title'] = 'Кадр: ' + (num + 1);

            Plotly.newPlot('main_chart', data, layout, defaultChartConfig);

            break;

        case 'column':
            var trace = {
                x: xValues,
                y: yValues,
                mode: 'markers',
                marker: {
                    size: 0,
                    color: '#00000000',
                    line: {
                        width: 0,
                        color: '#00000000'
                    }
                }
            };
            var data = [trace];
            var step = 0;
            if (xValues.length > 1)
                step = (xValues[1] - xValues[0]) / 2;

            var shapes = [];
            for (var i = 0; i < xValues.length; i++) {
                var rect = {
                    type: 'rect',
                    x0: xValues[i] - step,
                    y0: 0,
                    x1: xValues[i] + step,
                    y1: yValues[i],
                    fillcolor: '#5391e2',
                    line: {
                        width: 1
                    }
                }
                shapes.push(rect);
            }

            var layout = defaultChartLayout;
            layout['shapes'] = shapes;
            if (isChannel)
                layout['title'] = 'Канал ' + (num + 1);
            else
                layout['title'] = 'Кадр ' + (num + 1);
            Plotly.newPlot('main_chart', data, layout, defaultChartConfig);

            break;
    }

    var autoscale = $('#autoscale_plot').prop('checked');
    if (autoscale) {
        autoscalePlot();
        updateManualScaleFields();
    } else
        manualScalePlot();
}

function withoutBaseData(yValues, channel, frame) {
    if (yValues.length == channelNum)
        for (var i = 0; i < channelNum; i++)
            yValues[i] = yValues[i] - baseData[frame][i];

    if (yValues.length == frameNum)
        for (var i = 0; i < frameNum; i++)
            yValues[i] = yValues[i] - baseData[i][channel];

    return yValues;
}

function changeYValues(yValues, channel, frame) {
    var selected = $('#select_signal_type').find("option:selected").val();
    switch (selected) {
        case 'raw':
            break;

        case 'without_base':
            yValues = withoutBaseData(yValues, channel, frame);
            break;
    }

    return yValues;
}

function updatePlot() {
    var channel = document.getElementById("channel_slider_number").value - 1;
    var frame = document.getElementById("frame_slider_number").value - 1;
    var film = document.getElementById("film_slider_number").value - 1;

    var yValues = [];
    var isChannel = false;
    var num = frame;
    if (!document.getElementById("channel_slider_number").readOnly == true)
        for (var i = 0; i < frameNum; i++) {
            yValues.push(acquiredData[film][i][channel])
            isChannel = true;
            num = channel;
        }
    else
        for (var i = 0; i < channelNum; i++)
            yValues.push(acquiredData[film][frame][i])

    var xValues = [];
    for (var i = 0; i < yValues.length; i++)
        xValues.push(i + 1);

    yValues = changeYValues(yValues, channel, frame);

    setXYvaluesForManualScale(xValues, yValues);

    drawPlot(xValues, yValues, isChannel, num);
}

function manualScalePlot() {
    var xMin = Number(document.getElementById("x_scale_min").value);
    var xMax = Number(document.getElementById("x_scale_max").value);
    var yMin = Number(document.getElementById("y_scale_min").value);
    var yMax = Number(document.getElementById("y_scale_max").value);
    Plotly.relayout('main_chart', {
        'xaxis.range': [xMin, xMax],
        'yaxis.range': [yMin, yMax]
    });
}

function autoscalePlot() {
    Plotly.relayout('main_chart', {
        'xaxis.autorange': true,
        'yaxis.autorange': true
    });
}

var xMinForManualScale = 0;
var xMaxForManualScale = 0;
var yMinForManualScale = 0;
var yMaxForManualScale = 0;

function setXYvaluesForManualScale(xValues, yValues) {
    xMinForManualScale = Math.min.apply(Math, xValues) - 1;
    xMaxForManualScale = Math.max.apply(Math, xValues) + 1;

    yMinForManualScale = Math.min.apply(Math, yValues);
    if (yMinForManualScale >= 0)
        yMinForManualScale = 0;
    else
        yMinForManualScale = (Math.trunc(yMinForManualScale / 100) - 1) * 100;

    yMaxForManualScale = Math.max.apply(Math, yValues);
    yMaxForManualScale = (Math.trunc(yMaxForManualScale / 100) + 1) * 100;
}

function updateManualScaleFields() {
    document.getElementById("x_scale_min").value = xMinForManualScale;
    document.getElementById("x_scale_max").value = xMaxForManualScale;
    document.getElementById("y_scale_min").value = yMinForManualScale;
    document.getElementById("y_scale_max").value = yMaxForManualScale;
}

function checkRealTimeField() {
    var checked = $('#real_time').prop('checked');
    if (checked == true)
        $('#real_time_val').prop('disabled', false);
    else
        $('#real_time_val').prop('disabled', true);
}

function setFieldsFromJSON(json_obj) {
    for (var key in json_obj) {
        var value = json_obj[key];

        if (typeof value == 'undefined')
            continue;

        if (value == null)
            continue;

        if (document.getElementsByName(key).length == 2) {
            if (document.getElementsByName(key)[0].value == value) {
                document.getElementsByName(key)[0].checked = true;
                document.getElementsByName(key)[1].checked = false;
                continue;
            }
            if (document.getElementsByName(key)[1].value == value) {
                document.getElementsByName(key)[1].checked = true;
                document.getElementsByName(key)[0].checked = false;
                continue;
            }
        }
        if (document.getElementsByName(key)[0].classList.contains('hex-number') == true) {
            hexString = Number(value).toString(16);
            document.getElementsByName(key)[0].textContent = hexString;
            continue;
        }
        if (document.getElementsByName(key)[0].type == "number") {
            var step = document.getElementsByName(key)[0].step;
            if (Number.isInteger(Number(step)) == false) {
                document.getElementsByName(key)[0].value = Number(value) * tickLen;
                continue;
            }
        }
        document.getElementsByName(key)[0].value = value;

        if (value == true) {
            document.getElementsByName(key)[0].checked = true;
            continue;
        }
        if (value == false) {
            document.getElementsByName(key)[0].checked = false;
            continue;
        }
    }
}

var channelNum = -1;
var frameNum = -1;
var dataFilmNum = 1;
var acquiredData = [];
var baseData = [];
var stopDataRequest = false;
var inProgress = false;
var inExp = false;

var fullData=[];
var fullDataforPlot=[];


function setChannelAndFrameNum() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'channel_frame_num', false);
    xhr.send();
    json_obj = JSON.parse(xhr.responseText);
    channelNum = json_obj['channelNum'];
    frameNum = json_obj['frameNum'];
}


function setChannelSlider() {
    setChannelSliderValues();
    setChannelSliderFunctions();
}

function setChannelSliderValues() {
    var slider = document.getElementById("channel_slider");
    slider.max = channelNum;
    document.getElementById("channel_slider_number").max = channelNum;
}

function setChannelSliderFunctions() {
    $('#channel_slider').on('input', function() {
        document.getElementById("channel_slider_number").value = document.getElementById("channel_slider").value;
        updatePlot();
    });

    $('#channel_slider_number').on('input', function() {
        document.getElementById("channel_slider").value = document.getElementById("channel_slider_number").value;
        updatePlot();
    });
}

function setScaleInputFunctions() {
    $('#x_scale_min').on('input', function() {
        var minVal = Number(document.getElementById("x_scale_min").value);
        var maxVal = Number(document.getElementById("x_scale_max").value);
        if (minVal >= maxVal)
            document.getElementById("x_scale_min").value = document.getElementById("x_scale_max").value;
    });

    $('#x_scale_max').on('input', function() {
        var minVal = Number(document.getElementById("x_scale_min").value);
        var maxVal = Number(document.getElementById("x_scale_max").value);
        if (maxVal <= minVal)
            document.getElementById("x_scale_max").value = document.getElementById("x_scale_min").value;
    });

    $('#y_scale_min').on('input', function() {
        var minVal = Number(document.getElementById("y_scale_min").value);
        var maxVal = Number(document.getElementById("y_scale_max").value);
        if (minVal >= maxVal)
            document.getElementById("y_scale_min").value = document.getElementById("y_scale_max").value;
    });

    $('#y_scale_max').on('input', function() {
        var minVal = Number(document.getElementById("y_scale_min").value);
        var maxVal = Number(document.getElementById("y_scale_max").value);
        if (maxVal <= minVal)
            document.getElementById("y_scale_max").value = document.getElementById("y_scale_min").value;
    });

    $('#x_scale_min').on('change', function() {
        updatePlot();
    });

    $('#x_scale_max').on('change', function() {
        updatePlot();
    });

    $('#y_scale_min').on('change', function() {
        updatePlot();
    });

    $('#y_scale_max').on('change', function() {
        updatePlot();
    });
}

function dataArrayTo3DArray(dataArray, filmNum) {
    var data3DArray = [];
    for (var i = 0; i < filmNum; i++) {
        var frArray = [];
        for (var j = 0; j < frameNum; j++) {
            var chArray = [];
            for (var k = 0; k < channelNum; k++) {
                chArray.push(dataArray[i * channelNum * frameNum + j * channelNum + k]);
            }
            frArray.push(chArray);
        }
        data3DArray.push(frArray);
    }
    return data3DArray;
}

function setFrameSlider() {
    setFrameSliderValues();
    setFrameSliderFunctions();
}

function setFrameSliderValues() {
    var slider = document.getElementById("frame_slider");
    slider.max = frameNum;
    document.getElementById("frame_slider_number").max = frameNum;
}

function setFrameSliderFunctions() {
    $('#frame_slider').on('input', function() {
        document.getElementById("frame_slider_number").value = document.getElementById("frame_slider").value;
        updatePlot();
    });

    $('#frame_slider_number').on('input', function() {
        document.getElementById("frame_slider").value = document.getElementById("frame_slider_number").value;
        updatePlot();
    });
}

function setFilmSlider() {
    setFilmSliderValues(dataFilmNum);
    setFilmSliderFunctions();
}

function setFilmSliderValues(value) {
    var slider = document.getElementById("film_slider");
    slider.max = value;
    document.getElementById("film_slider_number").max = value;
    if (document.getElementById("film_slider_number").value > value)
        document.getElementById("film_slider_number").value = value;
}

function setFilmSliderFunctions() {
    $('#film_slider').on('input', function() {
        document.getElementById("film_slider_number").value = document.getElementById("film_slider").value;
        updatePlot();
    });

    $('#film_slider_number').on('input', function() {
        document.getElementById("film_slider").value = document.getElementById("film_slider_number").value;
        updatePlot();
    });
}

function onChFrRadioChange() {
    if (document.getElementById("channel_change_radio").checked == true) {
        document.getElementById("channel_slider").disabled = false;
        document.getElementById("channel_slider_number").readOnly = false;
        document.getElementById("frame_slider").disabled = true;
        document.getElementById("frame_slider_number").readOnly = true;
    } else {
        document.getElementById("channel_slider").disabled = true;
        document.getElementById("channel_slider_number").readOnly = true;
        document.getElementById("frame_slider").disabled = false;
        document.getElementById("frame_slider_number").readOnly = false;
    }

    if (acquiredData.length > 0)
        updatePlot();
}

function initData() {
    for (var i = 0; i < frameNum; i++) {
        var channelArray = [];
        for (var j = 0; j < channelNum; j++)
            channelArray.push(0);
        baseData.push(channelArray);
    }

    for (var i = 0; i < dataFilmNum; i++){
        acquiredData.push(baseData);
    }
}

function fitBaseData(data3DArray, filmNum) {
    var data2DArray = [];
    for (var i = 0; i < frameNum; i++) {
        var channelArray = [];
        for (var j = 0; j < channelNum; j++)
            channelArray.push(0);
        data2DArray.push(channelArray);
    }

    for (var i = 0; i < dataFilmNum; i++)
        for (var j = 0; j < frameNum; j++) {
            for (var k = 0; k < channelNum; k++)
                data2DArray[j][k] = data2DArray[j][k] + data3DArray[i][j][k];
        }

    for (var j = 0; j < frameNum; j++) {
        for (var k = 0; k < channelNum; k++)
            data2DArray[j][k] = data2DArray[j][k] / filmNum;
    }

    baseData = data2DArray;
}

function stopDataAcqusition() {
    if (inProgress) {
        setAcquireDataProgressBarValue(0);
        stopDataRequest = true;
        inProgress = false;
        toastr.info('Сбор данных остановлен');
    }
}

function acquireDataRequest(formData, filmNum, currentFilmNum, fullDataArray, realTime, realTimeVal, acquireBase) {
    if (stopDataRequest) {
        stopDataRequest = false;
        inProgress = false;
        return;
    }

    if (currentFilmNum == filmNum)
        setAcquireDataProgressBarValue(100);
    else
        setAcquireDataProgressBarValue(Math.round(currentFilmNum / filmNum * 100));

    if (currentFilmNum == filmNum) {
        var data3DArray = dataArrayTo3DArray(fullDataArray, filmNum);

        if (!acquireBase) {
            acquiredData = data3DArray;
            setFilmSliderValues(dataFilmNum);
            if (!realTime)
                toastr.info('Сбор данных завершён');
            updatePlot();
            if (realTime && !stopDataRequest) {
                setTimeout(acquireData, realTimeVal, formData, filmNum, realTime, realTimeVal, acquireBase);
            } else {

                inProgress = false;
            }
        } else {
            fitBaseData(data3DArray, filmNum);
            updatePlot();
            toastr.info('Сбор данных завершён');
            inProgress = false;
        }
        //inProgress = false;
    } else
        $.ajax({
            type: 'POST',
            url: '/acquire_data',
            data: JSON.stringify(formData),
            complete: function(response) {
                json_obj = JSON.parse(response.responseText);
                var dataArray = getDataArrayFromJSON(json_obj);
                for (var j = 0; j < dataArray.length; j++)
                    fullDataArray.push(dataArray[j]);

                acquireDataRequest(formData, filmNum, currentFilmNum + 1, fullDataArray, realTime, realTimeVal, acquireBase);
            }
        });
}

function getDataArrayFromJSON(json_obj) {
    var dataList = json_obj['dataOut'].split(' ');
    var dataArray = [];
    for (var i = 0; i < dataList.length; i++)
        if (dataList[i].length > 0)
            dataArray.push(Number(dataList[i]));

    return dataArray;
}

function acquireData(formData, filmNum, realTime, realTimeVal, acquireBase) {

    fullDataArray = []
    acquireDataRequest(formData, filmNum, 0, fullDataArray, realTime, realTimeVal, acquireBase);
}

function setAcquireDataProgressBarValue(value) {
    $('#acquire_data_progress').css('width', value + '%').attr('aria-valuenow', value);
    $("#acquire_data_progress").text(value + '%');
}

function savePlot(fileName, format) {
    if (format == 'png')
        Plotly.downloadImage('main_chart', { format: 'png', width: 800, height: 600, filename: fileName });

    if (format == 'svg')
        Plotly.downloadImage('main_chart', { format: 'svg', filename: fileName });
}

function resizePlot() {
    var ww = $(document).width();
    var hh = $('#top_field').height();
    var layout = {
        width: ww * 8 / 12 * 0.95,
        height: hh
    };

    Plotly.relayout('main_chart', layout);
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

    if ((numChannel == 1) && (ilimit == 2)){dac_code=0;};
    if ((numChannel == 1) && (ilimit == 1)){dac_code=1;};
    if ((numChannel == 2) && (ilimit == 2)){dac_code=2;};
    if ((numChannel == 2) && (ilimit == 1)){dac_code=3;};
    if ((numChannel == 3) && (ilimit == 4)){dac_code=4;};
    if ((numChannel == 3) && (ilimit == 3)){dac_code=5;};
    if ((numChannel == 3) && (ilimit == 2)){dac_code=6;};
    if ((numChannel == 3) && (ilimit == 1)){dac_code=7;};
    if ((numChannel == 4) && (ilimit == 4)){dac_code=8;};
    if ((numChannel == 4) && (ilimit == 3)){dac_code=9;};
    if ((numChannel == 4) && (ilimit == 2)){dac_code=10;};
    if ((numChannel == 4) && (ilimit == 1)){dac_code=11;};
    if ((numChannel == 5) && (ilimit == 2)){dac_code=12;};
    if ((numChannel == 5) && (ilimit == 1)){dac_code=13;};
    if ((numChannel == 6) && (ilimit == 2)){dac_code=14;};
    if ((numChannel == 6) && (ilimit == 1)){dac_code=15;};
    if ((numChannel == 7) && (ilimit == 4)){dac_code=16;};
    if ((numChannel == 7) && (ilimit == 3)){dac_code=17;};
    if ((numChannel == 7) && (ilimit == 2)){dac_code=18;};
    if ((numChannel == 7) && (ilimit == 1)){dac_code=19;};
    if ((numChannel == 8) && (ilimit == 4)){dac_code=20;};
    if ((numChannel == 8) && (ilimit == 3)){dac_code=21;};
    if ((numChannel == 8) && (ilimit == 2)){dac_code=22;};
    if ((numChannel == 8) && (ilimit == 1)){dac_code=23;};
    return dac_code;

}

function DataFormRead(){
    var limitTHR=[];

    limitTHR.push(document.getElementById("THR11").value);
    limitTHR.push(document.getElementById("THR12").value);

    limitTHR.push(document.getElementById("THR21").value);
    limitTHR.push(document.getElementById("THR22").value);

    limitTHR.push(document.getElementById("THR31").value);
    limitTHR.push(document.getElementById("THR32").value);
    limitTHR.push(document.getElementById("THR33").value);
    limitTHR.push(document.getElementById("THR34").value);

    limitTHR.push(document.getElementById("THR41").value);
    limitTHR.push(document.getElementById("THR42").value);
    limitTHR.push(document.getElementById("THR43").value);
    limitTHR.push(document.getElementById("THR44").value);

    limitTHR.push(document.getElementById("THR51").value);
    limitTHR.push(document.getElementById("THR52").value);


    limitTHR.push(document.getElementById("THR61").value);
    limitTHR.push(document.getElementById("THR62").value);

    limitTHR.push(document.getElementById("THR71").value);
    limitTHR.push(document.getElementById("THR72").value);
    limitTHR.push(document.getElementById("THR73").value);
    limitTHR.push(document.getElementById("THR74").value);

    limitTHR.push(document.getElementById("THR81").value);
    limitTHR.push(document.getElementById("THR82").value);
    limitTHR.push(document.getElementById("THR83").value);
    limitTHR.push(document.getElementById("THR84").value);

    return limitTHR;
}



window.onresize = function() {
    resizePlot();
};

window.onbeforeunload = function() {
    return;
}

$(document).ready(function() {
    setChannelAndFrameNum();
    initData();
    setChannelSlider();
    setFrameSlider();
    setFilmSlider();
    updatePlot();
    onChFrRadioChange();
    setScaleInputFunctions();
    resizePlot();

    toastr.options.timeOut = 900;



    $('#select_chart_type').on('change', function() {
        updatePlot();
    });

    $('#real_time').change(function() {
        checkRealTimeField();
    });

    $('#autoscale_plot').change(function() {
        updatePlot();
    });

    $('[name=chFrRadio]').change(function() {
        onChFrRadioChange();
    });

    checkRealTimeField();

    document.getElementById("write_to_reg_btn").onclick = function() {

        var activeTab = $('.tab-content').find('.active');
        var id = activeTab.attr('id');

        var formData = {};

        if (id == 'global_limit_settings') {

            var frameLen = document.getElementById("frame_len").value;
            formData[document.getElementById("frame_len").name] = Number(frameLen);
        }


        $.ajax({
            type: 'POST',
            url: '/write_regs',
            data: JSON.stringify(formData),
            complete: function(response) {
                //json_obj = JSON.parse(response.responseText);
                toastr.info('Значения записаны в регистры');
            }
        });
        return false;
    };

    document.getElementById("acquire_data_btn").onclick = function() {
        if (!inProgress) {
            toastr.info('Начался сбор данных');
            inProgress = true;
        } else {
            toastr.warning('Уже идёт сбор данных');
            return false;
        }
        var formData = {};
        dataFilmNum = document.getElementById("data_film_num").value;
        var forced = document.getElementById("forced_trigger").checked;

        formData[document.getElementById("forced_trigger").name] = forced;

        console.log (formData);

        var realTime = document.getElementById("real_time").checked;
        var realTimeVal = document.getElementById("real_time_val").value;

        acquireData(formData, dataFilmNum, realTime, realTimeVal, false);
        stopDataRequest = false;

        return false;
    };



    document.getElementById("save_plot_as_png").onclick = function() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var day = now.getDate();
        var hours = now.getHours();
        var minutes = now.getMinutes();

        var fileName = 'PLOT' + '_' + hours + '_' + minutes + '_' + day + '_' + month + '_' + year;
        savePlot(fileName, 'png');
        return false;
    };

    document.getElementById("save_data_as_txt").onclick = function() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var day = now.getDate();
        var hours = now.getHours();
        var minutes = now.getMinutes();

        var fileName = 'DATA' + '_' + hours + '_' + minutes + '_' + day + '_' + month + '_' + year;
        var fileString = '';
        var films = acquiredData.length;
        var frames = acquiredData[0].length;
        var channels = acquiredData[0][0].length;


        fileString = '%c' + ' ' + films + ' ' + frames + ' ' + channels + '\r\n';
        for (var i = 0; i < films; i++) {
            for (var j = 0; j < channels; j++) {
                if (j < 9)
                    fileString += (j + 1) + ': ';
                else
                    fileString += (j + 1) + ':';
                for (k = 0; k < frames; k++)
                    fileString += ' ' + acquiredData[i][k][j];
                fileString += '\r\n';
            }
            fileString += '\r\n';
        }

        var file = new File([fileString], fileName, { type: "text/plain;charset=utf-8" });
        saveAs(file, fileName);

        return false;
    };

    document.getElementById("d_reg_a_write_btn").onclick = function() {
        if (document.getElementById("d_reg_a_reg_num").checkValidity() == false) {
            toastr.warning('Некорректный номер регистра');
            return false;
        }
        if (document.getElementById("d_reg_a_data_in").checkValidity() == false) {
            toastr.warning('Некорректные входные данные');
            return false;
        }

        var formData = {};
        

        var regNum = document.getElementById("d_reg_a_reg_num").value;
        formData[document.getElementById("d_reg_a_reg_num").name] = parseInt('0x' + regNum);

        var dataIn = document.getElementById("d_reg_a_data_in").value;
        formData[document.getElementById("d_reg_a_data_in").name] = parseInt('0x' + dataIn);

        $.ajax({
            type: 'POST',
            url: '/d_reg_a_write',
            data: JSON.stringify(formData),
            complete: function(response) {
                json_obj = JSON.parse(response.responseText);
                var err = json_obj['status'];
                if (err < 0)
                    toastr.error('Ошибка при записи в регистр ' + '0x' + regNum);
                else
                    toastr.success('Произведена запись в регистр ' + '0x' + regNum);
            }
        });
        return false;
    };

    document.getElementById("d_reg_a_read_btn").onclick = function() {
        if (document.getElementById("d_reg_a_reg_num").checkValidity() == false) {
            toastr.warning('Некорректный номер регистра');
            return false;
        }

        var formData = {};

        var regNum = document.getElementById("d_reg_a_reg_num").value;
        formData[document.getElementById("d_reg_a_reg_num").name] = parseInt('0x' + regNum);

        console.log(formData);

        $.ajax({
            type: 'POST',
            url: '/d_reg_a_read',
            data: JSON.stringify(formData),
            complete: function(response) {
                json_obj = JSON.parse(response.responseText);
                var err = json_obj['status'];
                if (err < 0)
                    toastr.error('Ошибка при чтении из регистра ' + '0x' + regNum);
                else {
                    toastr.success('Произведено чтение из регистра ' + '0x' + regNum);
                    document.getElementById('d_reg_a_data_out').textContent = Number(json_obj['dataOut']).toString(16);
                }
            }
        });
        return false;
    };

    document.getElementById("stop_btn").onclick = function() {
        $.ajax({
            type: 'POST',
            url: '/stop_exp',
        });
        stopDataAcqusition();
        return false;
    };

    document.getElementById("d_reg_a_btn").onclick = function() {
        document.getElementById("d_reg_a_reg_num").value = "";
        document.getElementById("d_reg_a_data_in").value = "";
        document.getElementById("d_reg_a_data_out").textContent = "";
        return false;
    };

    document.getElementById("read_from_reg_btn").onclick = function() {
        $.ajax({
            type: 'GET',
            url: '/read_regs',
            complete: function(response) {
                json_obj = JSON.parse(response.responseText);
                //setFieldsFromJSON(json_obj);

                var activeTab = $('.tab-content').find('.active');
                var id = activeTab.attr('id');

                if (id == 'global_limit_settings') {
                    document.getElementById("frame_len").value = Number(json_obj['frameLen']);
                }

                toastr.info('Значения прочитаны из регистров');
            }
        });
        return false;
    };

    ///Global limits
    document.getElementById("d_limit_a_write_btn").onclick = function() {

        var LimitQuantity = 4;
        var regNum, dataIn;
        var formData = {};
        var formLimit =[];
        var formDataReady = [];
        var i;

        var limit1 = document.getElementById("limit_1").value;
        formLimit.unshift(limit1);
    
        var limit2 = document.getElementById("limit_2").value;
        formLimit.unshift(limit2);
    
        var limit3 = document.getElementById("limit_3").value;
        formLimit.unshift(limit3);
    
        var limit4 = document.getElementById("limit_4").value;
        formLimit.unshift(limit4);

        for ( var i=0; i <= LimitQuantity; i++){
            if (i == LimitQuantity){
                formData["regNum"]= parseInt('0x' + 260);//parseInt('0x' + 260); //260 ox608
                formData["dataIn"]= parseInt('0x' + 80);//parseInt('0x' + 80);; //80 ox128
                formDataReady.push(JSON.parse(JSON.stringify(formData)));   
            }
            else{
                formData["regNum"]=parseInt('0x' + 304);//304
                formData["dataIn"]=parseInt('0x' + i);//i
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]=parseInt('0x' + 305);//305
                formData["dataIn"]=parseInt(Number(formLimit.pop()));//Number(formLimit.pop());
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]=parseInt('0x'+260);//260
                formData["dataIn"]=parseInt('0x'+40);//40
                formDataReady.push(JSON.parse(JSON.stringify(formData)));
                }
        }
        
        function ajaxsend(i){
        $.ajax({
                url: '/d_reg_a_write',
                type: 'POST',
                data: JSON.stringify(formDataReady[i]),  
                contentType: "application/json",   
                complete: function(response) {
                json_obj = JSON.parse(response.responseText);
                var err = json_obj['status'];
                if (err < 0){
                    console.log('error', formDataReady[i].regNum, formDataReady[i].dataIn);
                    }
                else{
                    console.log('success', formDataReady[i].regNum, formDataReady[i].dataIn);
                    }
                },
            });
        }

        for(i=0; i<13;i++){
            ajaxsend(i);
        }    

    return false;
    };

    ///Individual limits
    document.getElementById("d_ilimit_a_write_btn").onclick = function(){
        /////Working with data
        var limitTHR=DataFormRead();

        var numChip=getDAC_Chip(document.getElementById("select_chip").options.selectedIndex);

        ///////Prepairing data
        var data_num=[1, 2, 3, 4, 5, 6, 7, 8];
        var dac_code_ch=[];
        var dac_code_forcalc=[];

        var regData=[];
        var dataIn=[];

        for (var i=0; i<data_num.length; i++){
            if ((data_num[i]==1) || (data_num[i]==2) || (data_num[i]==5) || (data_num[i]==6)){
                dac_code_ch.push(getDAC_Channel(data_num[i], 1));
                dac_code_ch.push(getDAC_Channel(data_num[i], 2));
                for(var k=0; k<2;k++){
                    dac_code_forcalc.push(numChip);
                }
            } else {
                dac_code_ch.push(getDAC_Channel(data_num[i], 1));
                dac_code_ch.push(getDAC_Channel(data_num[i], 2)); 
                dac_code_ch.push(getDAC_Channel(data_num[i], 3));
                dac_code_ch.push(getDAC_Channel(data_num[i], 4)); 
                for(var k=0; k<4;k++){
                    dac_code_forcalc.push(numChip);
                }
            }

        }


        for (var i=0; i<dac_code_ch.length; i++){
            regData[i]=dac_code_ch[i]+dac_code_forcalc[i];
        }


        ///Send data
        var InLimitQuantity=regData.length;
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
                formData["dataIn"]=parseInt(regData[i]);
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]=parseInt('0x' + 301);
                formData["dataIn"]=parseInt(Number(limitTHR[i]));
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]=parseInt('0x'+260);
                formData["dataIn"]=parseInt('0x'+10);
                formDataReady.push(JSON.parse(JSON.stringify(formData)));
                }
        }
        

        function ajaxsend(i){
        $.ajax({
                url: '/d_reg_a_write',
                type: 'POST',
                data: JSON.stringify(formDataReady[i]),  
                contentType: "application/json",   
                complete: function(response) {
                json_obj = JSON.parse(response.responseText);
                var err = json_obj['status'];
                if (err < 0){
                    console.log('error', formDataReady[i].regNum, formDataReady[i].dataIn);
                    }
                else{
                    console.log('success', formDataReady[i].regNum, formDataReady[i].dataIn);
                    }
                },
            });
        }

        for(i=0; i<73;i++){
            ajaxsend(i);
        } 
        return false;    
    };


    document.getElementById('input').addEventListener('change', function(e) {
       let file = document.getElementById('input').files[0];

       (async () => {
        const fileContent = await file.text();

        var data_load=fileContent.split(" ");

        data_load = data_load.filter(function(x) {
            if ((x !== '\n') && (x !== ' ') && (x !== '-')) {
                return x;
            }
        });

        document.getElementById("THR11").value=Number(data_load[0]);
        document.getElementById("THR12").value=Number(data_load[1]);
        
        document.getElementById("THR21").value=Number(data_load[2]);
        document.getElementById("THR22").value=Number(data_load[3]);

        document.getElementById("THR31").value=Number(data_load[4]);
        document.getElementById("THR32").value=Number(data_load[5]);
        document.getElementById("THR33").value=Number(data_load[6]);
        document.getElementById("THR34").value=Number(data_load[7]);

        document.getElementById("THR41").value=Number(data_load[8]);
        document.getElementById("THR42").value=Number(data_load[9]);
        document.getElementById("THR43").value=Number(data_load[10]);
        document.getElementById("THR44").value=Number(data_load[11]);

        document.getElementById("THR51").value=Number(data_load[12]);
        document.getElementById("THR52").value=Number(data_load[13]);
        
        document.getElementById("THR61").value=Number(data_load[14]);
        document.getElementById("THR62").value=Number(data_load[15]);

        document.getElementById("THR71").value=Number(data_load[16]);
        document.getElementById("THR72").value=Number(data_load[17]);
        document.getElementById("THR73").value=Number(data_load[18]);
        document.getElementById("THR74").value=Number(data_load[19]);

        document.getElementById("THR81").value=Number(data_load[20]);
        document.getElementById("THR82").value=Number(data_load[21]);
        document.getElementById("THR83").value=Number(data_load[22]);
        document.getElementById("THR84").value=Number(data_load[23]);

      })();
    });

    document.getElementById("limit_save_file").onclick = function() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var day = now.getDate();
        var hours = now.getHours();
        var minutes = now.getMinutes();

        var numChip=document.getElementById("select_chip").options.selectedIndex;

        var fileName = 'LIMIT' + '_' + 'Chip'+ numChip +'_' + hours + '_' + minutes + '_' + day + '_' + month + '_' + year;
        var fileString = '';

        limitTHR=DataFormRead();
        limitTHR.splice(2, 0, '-', '-');
        limitTHR.splice(6, 0, '-', '-');
        limitTHR.splice(18, 0, '-', '-');
        limitTHR.splice(22, 0, '-', '-');


        data_arr=[]

        for (var i=0; i<8; i++){
            data_arr.push([]);
            data_arr[i].push(new Array(4));

            for (var j=0; j<4; j++){
                data_arr[i][j]=limitTHR[j+i*4];
            }
        }

        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < 4; j++) {
                fileString += ' ' + data_arr[i][j];
            }
            fileString += ' \n';
        }

        var file = new File([fileString], fileName, { type: "text/plain;charset=utf-8" });
        saveAs(file, fileName);

        return false;
    };
    
    function r2c(arr) {
        var arrC = [],
        x = Math.max.apply(Math, arr.map(function (e) {return e.length;})),
        y = arr.length,
        i, j;
        for (i = 0; i < x; ++i) {   // this is the loop "down"
            arrC[i] = [];
            for (j = 0; j < y; ++j) // and this is the loop "across"
                if (i in arr[j])
                    arrC[i].push(arr[j][i]);
        }
        return arrC;
    }

    function drawPlot(data_x, data_y) {
        var ctx = document.getElementById("graph_data").getContext("2d");
        ctx.canvas.width = 800;
        ctx.canvas.height = 800;
        let chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data_x,
                datasets: [{
                label: 'Characteristic', 
                backgroundColor: 'transparent',
                borderColor: 'green',
                data: data_y}]
        },
        options: {
            responsive: false,
        }
        });

    }

    var data_x=[];

    function formCalData(ch_num,step_num){
        var formData = {};
        var formDataReady = [];

        for ( var i=0; i <= 64; i=i+step_num){
            if (i <=64){
                formData["regNum"]=parseInt('0x' + 300);
                formData["dataIn"]=parseInt(ch_num);//4 chip ch8 thr1 60+17/dec 119 
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]=parseInt('0x' + 301);
                formData["dataIn"]=parseInt(Number(i));
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]=parseInt('0x'+260);
                formData["dataIn"]=parseInt('0x'+10);
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"]= parseInt('0x' + 260);
                formData["dataIn"]= parseInt('0x' + 20);
                formDataReady.push(JSON.parse(JSON.stringify(formData)));  
            }
        }

        return formDataReady;
    }


    function ajaxsend(i, formDataReady){
        $.ajax({
                url: '/d_reg_a_write',
                type: 'POST',
                data: JSON.stringify(formDataReady[i]),  
                contentType: "application/json",   
                complete: function(response) {
                json_obj = JSON.parse(response.responseText);
                var err = json_obj['status'];
                if (err < 0){
                    //console.log('error', formDataReady[i].regNum, formDataReady[i].dataIn);
                    }
                else{
                    //console.log('success', formDataReady[i].regNum, formDataReady[i].dataIn);
                    }
                },
            });
    }


    function sendCalData(thr_num, c, send_data){
        for (i=0; i<4; i++){
            ajaxsend(4*c+i,send_data);}
    }


    function dataPause(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    


    document.getElementById("d_add_graph_btn").onclick = function(){

        var data_arr=[];
        var data_ch=[]; 
        var data_for_dr=[];
        data_x=[];
        fullDataforPlot=[];
        var n=0;
        var c=0;
        var data_start=0;

        var chip_num=getDAC_Chip(Number(document.getElementById("chip_num").value));
        var chlim_num=getDAC_Channel(Number(document.getElementById("ch_num").value),Number(document.getElementById("lim_num").value));
        var ch_num=chip_num+chlim_num;

        var c_num=Number(document.getElementById("count_number").value);
        var st_num=Number(document.getElementById("step_number").value);

        var send_data=formCalData(ch_num, st_num);
        var thr_num=Math.round(64/st_num);
        var s=0;
        
        var formDataReady = [];
        var fullDataArray=[];

        var datasendprom = 0;
        let DataTimer = setTimeout(async function dtick() {
            
            if(n==0){
                sendCalData(thr_num,c,send_data); 
                s=0;
                fullData=[];
                n=n+1;
                console.log("Data send");
            }

            if (n==c_num+1){

                data_x.push(JSON.stringify(send_data[4*c+1].dataIn));
                for (var i=0; i<data_ch.length; i++){
                    s = s + data_ch[i];
                    if (i==data_ch.length-1){
                        fullDataforPlot.push(s/c_num); 
                    }
                }
                
                n=0;
                datasendprom=0;
                thr_num=thr_num-1;
                c=c+1;
                data_ch=[];
                console.log("Current value", n, thr_num, c);
                
            }

            if (datasendprom!=n){
                datasendprom=n;
                acqDataReq(); 
            };
            
            if (fullDataArray.length!=0){
                    data_ch.push(fullDataArray[20+chlim_num]);
                    fullDataArray=[];
                    console.log("This mass", n, data_ch);
                    n=n+1;
                    console.log("DataSend", datasendprom, n)} ;

            if (thr_num>0) DataTimer = setTimeout(dtick, 0.5);

            if (thr_num==0) drawPlot(data_x,fullDataforPlot);  
             
        }, 0.5);

        function acqDataReq() {
            var formData = {};
            formData["forcedTrigger"] = true;
            $.ajax({
                    type: 'POST',
                    url: '/acquire_data',
                    data: JSON.stringify(formData),
                    complete: function(response) {
                        json_obj = JSON.parse(response.responseText);
                        fullDataArray=[];
                        var dataArray = getDataArrayFromJSON(json_obj);
                        console.log("Send data",dataArray);
                        for (var j = 0; j < dataArray.length; j++)
                            fullDataArray.push(dataArray[j]);
                        console.log("Sum data",fullDataArray);

                    }
                });
            }

        return false;
  
    };
    document.getElementById("d_draw_save_btn").onclick = function() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var day = now.getDate();
        var hours = now.getHours();
        var minutes = now.getMinutes();

        var numChip=document.getElementById("chip_num").value;
        var numChan=document.getElementById("ch_num").value;
        var numCh=document.getElementById("lim_num").value;
        //console.log(numChip)

        var fileName = 'Char' + '_' + 'Chip' + numChip + '_' + 'Channel' + numChan + '_' + 'Limit' + numCh + '_' + hours + '_' + minutes + '_' + day + '_' + month + '_' + year;
        var fileString = '';

        data_arr=[]


        for (var i = 0; i < fullDataforPlot.length; i++) {

            fileString += 'x ' + data_x[i] + ' ' +'y ' + fullDataforPlot[i];

            fileString += ' \n';
        }

        var file = new File([fileString], fileName, { type: "text/plain;charset=utf-8" });
        saveAs(file, fileName);

        return false;
    };
        

});


    

