const triggerTickLen = 1000. / 120.; //ns

function getFormData(formId) {
    var uncheckedBoxes = $(formId + ' input[type=checkbox]:not(:checked)').map(
        function () {
            var obj = {};
            obj[this.name] = false;
            return obj;
        }).get();
    var checkedBoxes = $(formId + ' input[type=checkbox]:checked').map(
        function () {
            var obj = {};
            obj[this.name] = true;
            return obj;
        }).get();

    var rawFormData = $(formId).serializeArray();
    var otherFields = {};

    $.map(rawFormData, function (n, i) {
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

function drawChar(data_x, data_y, chipNum, chNum, chSen){
    var trace = {
        x: data_x,
        y: data_y,
        type: 'line',
        line: {
            width: 2,
            color: 'green'
        }
    };
    var layout = {
        tick0: 0,
        yaxis:{range:[0,100]},
        paper_bgcolor: "rgba(0,0,0,0)",
        title:'Counting characteristic '+ 'Chip '+ chipNum + ' Channel '+ chNum + ' Channel of sensor '+ chSen
    };
    var data = [trace];
    Plotly.newPlot('ch_chart', data, layout);
}

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
    //var film = document.getElementById("film_slider_number").value - 1;
    var film = 0;

    var yValues = [];
    var yValues1 = [];
    var yValuesSum = 0;
    var isChannel = false;
    var num = frame;
    if (!document.getElementById("channel_slider_number").readOnly == true)
        for (var i = 0; i < channelNum; i++) {
            yValues1.push(acquiredData[film][frame][i]);
            isChannel = true;
            num = channel;

            if (i == channelNum - 1) {
                for (var k = 0; k < channelNum; k++) {
                    if (k < 48) {
                        yValues[2 * k] = yValues1[k];
                    } else if (k >= 48) {
                        yValues[(95 - k) * 2 + 1] = yValues1[k];
                    }
                }
            }
        }
    else
        for (var i = 0; i < channelNum + 1; i++) {
            if (i == channelNum) { yValues.push((Math.round(yValuesSum * 100 / (yValues.length - 8))) / 100); } else {//4 high noise+ 4 empty
                yValues.push(acquiredData[film][frame][i]);
                if ((i == 24) || (i == 32) || (i == 40) || (i == 88)) { yValuesSum += 0 } else {
                    yValuesSum += yValues[i];
                }
            }
        }

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

var fullData = [];
var fullDataArray = [];
var fullDataforPlot = [];
var fullDataforGis = [];
var fullDataforPlotGl=[];
var data_x = [];


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
    $('#channel_slider').on('input', function () {
        document.getElementById("channel_slider_number").value = document.getElementById("channel_slider").value;
        updatePlot();
    });

    $('#channel_slider_number').on('input', function () {
        document.getElementById("channel_slider").value = document.getElementById("channel_slider_number").value;
        updatePlot();
    });
}

function setScaleInputFunctions() {
    $('#x_scale_min').on('input', function () {
        var minVal = Number(document.getElementById("x_scale_min").value);
        var maxVal = Number(document.getElementById("x_scale_max").value);
        if (minVal >= maxVal)
            document.getElementById("x_scale_min").value = document.getElementById("x_scale_max").value;
    });

    $('#x_scale_max').on('input', function () {
        var minVal = Number(document.getElementById("x_scale_min").value);
        var maxVal = Number(document.getElementById("x_scale_max").value);
        if (maxVal <= minVal)
            document.getElementById("x_scale_max").value = document.getElementById("x_scale_min").value;
    });

    $('#y_scale_min').on('input', function () {
        var minVal = Number(document.getElementById("y_scale_min").value);
        var maxVal = Number(document.getElementById("y_scale_max").value);
        if (minVal >= maxVal)
            document.getElementById("y_scale_min").value = document.getElementById("y_scale_max").value;
    });

    $('#y_scale_max').on('input', function () {
        var minVal = Number(document.getElementById("y_scale_min").value);
        var maxVal = Number(document.getElementById("y_scale_max").value);
        if (maxVal <= minVal)
            document.getElementById("y_scale_max").value = document.getElementById("y_scale_min").value;
    });

    $('#x_scale_min').on('change', function () {
        updatePlot();
    });

    $('#x_scale_max').on('change', function () {
        updatePlot();
    });

    $('#y_scale_min').on('change', function () {
        updatePlot();
    });

    $('#y_scale_max').on('change', function () {
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
    $('#frame_slider').on('input', function () {
        document.getElementById("frame_slider_number").value = document.getElementById("frame_slider").value;
        updatePlot();
    });

    $('#frame_slider_number').on('input', function () {
        document.getElementById("frame_slider").value = document.getElementById("frame_slider_number").value;
        updatePlot();
    });
}

/*function setFilmSlider() {
    setFilmSliderValues(dataFilmNum);
    setFilmSliderFunctions();
}*/

/*function setFilmSliderValues(value) {
    var slider = document.getElementById("film_slider");
    slider.max = value;
    document.getElementById("film_slider_number").max = value;
    if (document.getElementById("film_slider_number").value > value)
        document.getElementById("film_slider_number").value = value;
}*/

function setFilmSliderFunctions() {
    $('#film_slider').on('input', function () {
        document.getElementById("film_slider_number").value = document.getElementById("film_slider").value;
        updatePlot();
    });

    $('#film_slider_number').on('input', function () {
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

    for (var i = 0; i < dataFilmNum; i++) {
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
            //setFilmSliderValues(dataFilmNum);
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
            complete: function (response) {
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

function getDACChip(numChip) {
    var dac_code;

    if (numChip == 1) { dac_code = parseInt('0', 16); }
    if (numChip == 2) { dac_code = parseInt('20', 16); }
    if (numChip == 3) { dac_code = parseInt('40', 16); }
    if (numChip == 4) { dac_code = parseInt('60', 16); }
    if (numChip == 5) { dac_code = parseInt('80', 16); }
    if (numChip == 6) { dac_code = parseInt('A0', 16); }

    if (numChip == 7) { dac_code = parseInt('100', 16); }
    if (numChip == 8) { dac_code = parseInt('120', 16); }
    if (numChip == 9) { dac_code = parseInt('140', 16); }
    if (numChip == 10) { dac_code = parseInt('160', 16); }
    if (numChip == 11) { dac_code = parseInt('180', 16); }
    if (numChip == 12) { dac_code = parseInt('1A0', 16); }
    return dac_code;
}

function getDACChannel(numChannel, ilimit) {
    var dac_code;

    if ((numChannel == 1) && (ilimit == 2)) { dac_code = 0; };
    if ((numChannel == 1) && (ilimit == 1)) { dac_code = 1; };
    if ((numChannel == 2) && (ilimit == 2)) { dac_code = 2; };
    if ((numChannel == 2) && (ilimit == 1)) { dac_code = 3; };
    if ((numChannel == 3) && (ilimit == 4)) { dac_code = 4; };
    if ((numChannel == 3) && (ilimit == 3)) { dac_code = 5; };
    if ((numChannel == 3) && (ilimit == 2)) { dac_code = 6; };
    if ((numChannel == 3) && (ilimit == 1)) { dac_code = 7; };
    if ((numChannel == 4) && (ilimit == 4)) { dac_code = 8; };
    if ((numChannel == 4) && (ilimit == 3)) { dac_code = 9; };
    if ((numChannel == 4) && (ilimit == 2)) { dac_code = 10; };
    if ((numChannel == 4) && (ilimit == 1)) { dac_code = 11; };
    if ((numChannel == 5) && (ilimit == 2)) { dac_code = 12; };
    if ((numChannel == 5) && (ilimit == 1)) { dac_code = 13; };
    if ((numChannel == 6) && (ilimit == 2)) { dac_code = 14; };
    if ((numChannel == 6) && (ilimit == 1)) { dac_code = 15; };
    if ((numChannel == 7) && (ilimit == 4)) { dac_code = 16; };
    if ((numChannel == 7) && (ilimit == 3)) { dac_code = 17; };
    if ((numChannel == 7) && (ilimit == 2)) { dac_code = 18; };
    if ((numChannel == 7) && (ilimit == 1)) { dac_code = 19; };
    if ((numChannel == 8) && (ilimit == 4)) { dac_code = 20; };
    if ((numChannel == 8) && (ilimit == 3)) { dac_code = 21; };
    if ((numChannel == 8) && (ilimit == 2)) { dac_code = 22; };
    if ((numChannel == 8) && (ilimit == 1)) { dac_code = 23; };
    return dac_code;

}

function getCounterNumber(numChannel, ilimit) {
    var count_code;

    if ((numChannel == 1) && (ilimit == 2)) { count_code = 1; };
    if ((numChannel == 1) && (ilimit == 1)) { count_code = 2; };
    if ((numChannel == 2) && (ilimit == 2)) { count_code = 3; };
    if ((numChannel == 2) && (ilimit == 1)) { count_code = 4; };
    if ((numChannel == 3) && (ilimit == 4)) { count_code = 5; };
    if ((numChannel == 3) && (ilimit == 3)) { count_code = 6; };
    if ((numChannel == 3) && (ilimit == 2)) { count_code = 7; };
    if ((numChannel == 3) && (ilimit == 1)) { count_code = 8; };
    if ((numChannel == 4) && (ilimit == 4)) { count_code = 9; };
    if ((numChannel == 4) && (ilimit == 3)) { count_code = 10; };
    if ((numChannel == 4) && (ilimit == 2)) { count_code = 11; };
    if ((numChannel == 4) && (ilimit == 1)) { count_code = 12; };
    if ((numChannel == 5) && (ilimit == 2)) { count_code = 13; };
    if ((numChannel == 5) && (ilimit == 1)) { count_code = 13; };
    if ((numChannel == 6) && (ilimit == 2)) { count_code = 14; };
    if ((numChannel == 6) && (ilimit == 1)) { count_code = 14; };
    if ((numChannel == 7) && (ilimit == 4)) { count_code = 15; };
    if ((numChannel == 7) && (ilimit == 3)) { count_code = 15; };
    if ((numChannel == 7) && (ilimit == 2)) { count_code = 16; };
    if ((numChannel == 7) && (ilimit == 1)) { count_code = 16; };
    if ((numChannel == 8) && (ilimit == 4)) { count_code = 17; };
    if ((numChannel == 8) && (ilimit == 3)) { count_code = 17; };
    if ((numChannel == 8) && (ilimit == 2)) { count_code = 18; };
    if ((numChannel == 8) && (ilimit == 1)) { count_code = 18; };
    return count_code;

}

function firstElemData(numChip) {
    var startValue;
    if (numChip == 1) { startValue = 0; };
    if (numChip == 2) { startValue = 8; };
    if (numChip == 3) { startValue = 16; };
    if (numChip == 4) { startValue = 24; };
    if (numChip == 5) { startValue = 32; };
    if (numChip == 6) { startValue = 40; };

    if (numChip == 7) { startValue = 48; };
    if (numChip == 8) { startValue = 56; };
    if (numChip == 9) { startValue = 64; };
    if (numChip == 10) { startValue = 72; };
    if (numChip == 11) { startValue = 80; };
    if (numChip == 12) { startValue = 88; };
    return startValue;
}

function DataFormRead() {
    var limitTHR = [];

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

function THRLoad(data_load) {
    document.getElementById("THR11").value = Number(data_load[0]);
    document.getElementById("THR12").value = Number(data_load[1]);

    document.getElementById("THR21").value = Number(data_load[2]);
    document.getElementById("THR22").value = Number(data_load[3]);

    document.getElementById("THR31").value = Number(data_load[4]);
    document.getElementById("THR32").value = Number(data_load[5]);
    document.getElementById("THR33").value = Number(data_load[6]);
    document.getElementById("THR34").value = Number(data_load[7]);

    document.getElementById("THR41").value = Number(data_load[8]);
    document.getElementById("THR42").value = Number(data_load[9]);
    document.getElementById("THR43").value = Number(data_load[10]);
    document.getElementById("THR44").value = Number(data_load[11]);

    document.getElementById("THR51").value = Number(data_load[12]);
    document.getElementById("THR52").value = Number(data_load[13]);

    document.getElementById("THR61").value = Number(data_load[14]);
    document.getElementById("THR62").value = Number(data_load[15]);

    document.getElementById("THR71").value = Number(data_load[16]);
    document.getElementById("THR72").value = Number(data_load[17]);
    document.getElementById("THR73").value = Number(data_load[18]);
    document.getElementById("THR74").value = Number(data_load[19]);

    document.getElementById("THR81").value = Number(data_load[20]);
    document.getElementById("THR82").value = Number(data_load[21]);
    document.getElementById("THR83").value = Number(data_load[22]);
    document.getElementById("THR84").value = Number(data_load[23]);

}

function ajaxSendDataAll(ind, formDataReady) {
    if (ind < 0 || ind >= formDataReady.length) {
        toastr.info('Пороги записаны');
        //console.log("Пороги записаны");
        return;
    }

    $.ajax({
        url: '/d_reg_a_write',
        type: 'POST',
        data: JSON.stringify(formDataReady[ind]),
        contentType: "application/json",
        complete: function (response) {
            json_obj = JSON.parse(response.responseText);
            var err = json_obj['status'];
            if (err < 0) {
                //console.log('error', formDataReady[ind].regNum, formDataReady[ind].dataIn);
            }
            else {
                //console.log('success', formDataReady[ind].regNum, formDataReady[ind].dataIn);
            }
        },
        success: (result) => {
            ajaxSendDataAll(ind + 1, formDataReady);
        }
    });
}

function acqDataReq() {
    var formData = {};
    formData["forcedTrigger"] = true;
    fullDataArray = [];
    $.ajax({
        type: 'POST',
        url: '/acquire_data',
        data: JSON.stringify(formData),
        complete: function (response) {
            json_obj = JSON.parse(response.responseText);
            var dataArray = getDataArrayFromJSON(json_obj);
            for (var j = 0; j < dataArray.length; j++)
                fullDataArray.push(dataArray[j]);
        }
    });
}

function get2dimensional(array, limit) {
    const array2 = [];
    let section;

    for (const [index, element] of array.entries()) {
        if (index % limit === 0) array2.push(section = []);
        section.push(element);
    }

    return array2;
}

function r2c(arr) {
    var arrC = [],
        x = Math.max.apply(Math, arr.map(function (e) { return e.length; })),
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

function numChipAutoGen() {
    var numChip = [];

    for (var i = 0; i < 6; i++) {
        numChip.push(32 * i);
    };
    for (var i = 8; i < 14; i++) {
        numChip.push(32 * i);
    };
    return numChip;
}
/**Form and load local THR*/
function formTHR(numChip, limitTHR) {

    console.log("LimitTHR", limitTHR, numChip, numChip.length);

    var chip_num = [1, 2, 3, 4, 5, 6, 7, 8];
    var dac_code_ch = [];
    var chipcode_forcalc = [];

    var regData = [];

    for (var j = 0; j < numChip.length; j++) {
        for (var i = 0; i < chip_num.length; i++) {
            if ((chip_num[i] == 1) || (chip_num[i] == 2) || (chip_num[i] == 5) || (chip_num[i] == 6)) {
                dac_code_ch.push(getDACChannel(chip_num[i], 1));
                dac_code_ch.push(getDACChannel(chip_num[i], 2));
                for (var k = 0; k < 2; k++) {
                    chipcode_forcalc.push(numChip[j]);
                }
            } else {
                dac_code_ch.push(getDACChannel(chip_num[i], 1));
                dac_code_ch.push(getDACChannel(chip_num[i], 2));
                dac_code_ch.push(getDACChannel(chip_num[i], 3));
                dac_code_ch.push(getDACChannel(chip_num[i], 4));
                for (var k = 0; k < 4; k++) {
                    chipcode_forcalc.push(numChip[j]);
                }
            }

        }
    };

    for (var i = 0; i < dac_code_ch.length; i++) {
        regData[i] = dac_code_ch[i] + chipcode_forcalc[i];
    }
    console.log("Chip data", chipcode_forcalc, regData);

    sendTHRLocLim(regData, limitTHR)
}

function sendTHRLocLim(regData, limitTHR) {

    var InLimitQuantity = regData.length;
    var formData = {};
    var formDataReady = [];

    for (var i = 0; i <= InLimitQuantity; i++) {
        if (i == InLimitQuantity) {
            formData["regNum"] = parseInt('0x' + 260);
            formData["dataIn"] = parseInt('0x' + 20);
            formDataReady.push(JSON.parse(JSON.stringify(formData)));
        } else {
            formData["regNum"] = parseInt('0x' + 300);
            formData["dataIn"] = parseInt(regData[i]);
            formDataReady.push(JSON.parse(JSON.stringify(formData)));

            formData["regNum"] = parseInt('0x' + 301);
            formData["dataIn"] = parseInt(Number(limitTHR[i]));
            formDataReady.push(JSON.parse(JSON.stringify(formData)));

            formData["regNum"] = parseInt('0x' + 260);
            formData["dataIn"] = parseInt('0x' + 10);
            formDataReady.push(JSON.parse(JSON.stringify(formData)));
        }
    }

    console.log("Data Ready", formDataReady);

    ajaxSendDataAll(0, formDataReady);

    return false;
}
/**Form Global and Individual THR
 * Make 3 registers on one side, 3 on the other, 
 * and at the end the register is written to the chips, 
 * since this function forms a general list of registers 
 * for the experiment */
function formGTHR(dataIn) {
    var formData = {};
    var formDataReady = [];
    var InLimitQuantity = dataIn.length;

    for (var i = 0; i < InLimitQuantity; i++) {

        formData["regNum"] = parseInt('0x' + 304);//for ind 300
        formData["dataIn"] = parseInt(0);//work with 1 Global Limit (left Part)
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 305);//for ind 301
        formData["dataIn"] = parseInt(Number(dataIn[i]));
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 260);
        formData["dataIn"] = parseInt('0x' + 40);//for ind 10
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 304);//for ind 300
        formData["dataIn"] = parseInt(4);//work with 1 Global Limit (right Part)
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 305);//for ind 301
        formData["dataIn"] = parseInt(Number(dataIn[i]));
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 260);
        formData["dataIn"] = parseInt('0x' + 40);//for ind 10
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 260);
        formData["dataIn"] = parseInt('0x' + 80);//for ind 20
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

    }
    console.log("formTHR",formDataReady);
    return formDataReady;
}
function formITHR(ch_num, dataIn) {
    var formData = {};
    var formDataReady = [];
    var InLimitQuantity = dataIn.length;
    console.log(ch_num, dataIn);

    for (var i = 0; i <= InLimitQuantity; i++) {

        formData["regNum"] = parseInt('0x' + 300);
        formData["dataIn"] = parseInt(ch_num);
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 301);
        formData["dataIn"] = parseInt(Number(i));
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 260);
        formData["dataIn"] = parseInt('0x' + 10);
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

        formData["regNum"] = parseInt('0x' + 260);
        formData["dataIn"] = parseInt('0x' + 20);
        formDataReady.push(JSON.parse(JSON.stringify(formData)));

    }
    console.log(formDataReady);
    return formDataReady;
}

/**Allocation of registers of a given threshold 
 (that is, which 4/7 registers for Ilim/Glim need to be sent) from the total threshold array*/
function sendCalData(count_lim, send_data, mode) {
    var limsend = [];
    for (i = 0; i < mode; i++) {
        limsend.push(send_data[mode * count_lim + i]);
    }
    console.log("THR_Lim", limsend);
    ajaxSendDataAll(0, limsend);
}

function AutoTHRSave(THRValue, numChip) {
    var fileName = 'AutoLimit';
    var fileString = '';

    var data_arr = []

    for (var k = 0; k < numChip; k++) {
        for (var i = 0; i < 8; i++) {
            data_arr.push([]);
            data_arr[i].push(new Array(4));

            for (var j = 0; j < 4; j++) {
                data_arr[i][j] = THRValue[j + (8 * k + i) * 4];
            }
        }

        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < 4; j++) {
                fileString += ' ' + data_arr[i][j];
            }
            fileString += ' \n';
        }
    }

    var file = new File([fileString], fileName, { type: "text/plain;charset=utf-8" });
    saveAs(file, fileName);

}

window.onresize = function () {
    resizePlot();
};

window.onbeforeunload = function () {
    return;
}

$(document).ready(function () {
    setChannelAndFrameNum();
    initData();
    setChannelSlider();
    setFrameSlider();
    //setFilmSlider();
    updatePlot();
    onChFrRadioChange();
    setScaleInputFunctions();
    resizePlot();

    toastr.options.timeOut = 900;



    $('#select_chart_type').on('change', function () {
        updatePlot();
    });

    $('#real_time').change(function () {
        checkRealTimeField();
    });

    $('#autoscale_plot').change(function () {
        updatePlot();
    });

    $('[name=chFrRadio]').change(function () {
        onChFrRadioChange();
    });

    checkRealTimeField();

    document.getElementById("write_to_reg_btn").onclick = function () {

        var activeTab = $('.tab-content').find('.active');
        var id = activeTab.attr('id');

        var formData = {};

        if (id == 'global_limit_settings') {

            var frameLen = document.getElementById("frame_len").value;
            formData[document.getElementById("frame_len").name] = Number(frameLen) + 1;
        }


        $.ajax({
            type: 'POST',
            url: '/write_regs',
            data: JSON.stringify(formData),
            complete: function (response) {
                //json_obj = JSON.parse(response.responseText);
                toastr.info('Значения записаны в регистры');
            }
        });
        return false;
    };

    document.getElementById("acquire_data_btn").onclick = function () {
        if (!inProgress) {
            toastr.info('Начался сбор данных');
            inProgress = true;
        } else {
            toastr.warning('Уже идёт сбор данных');
            return false;
        }
        var formData = {};
        dataFilmNum = 1;
        //dataFilmNum = document.getElementById("data_film_num").value;
        var forced = document.getElementById("forced_trigger").checked;

        formData[document.getElementById("forced_trigger").name] = forced;

        var realTime = document.getElementById("real_time").checked;
        var realTimeVal = document.getElementById("real_time_val").value;

        acquireData(formData, dataFilmNum, realTime, realTimeVal, false);
        stopDataRequest = false;

        return false;
    };

    document.getElementById("save_plot_as_png").onclick = function () {
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

    document.getElementById("save_data_as_txt").onclick = function () {
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

    document.getElementById("d_reg_a_write_btn").onclick = function () {
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

        console.log(formData);

        $.ajax({
            type: 'POST',
            url: '/d_reg_a_write',
            data: JSON.stringify(formData),
            complete: function (response) {
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

    document.getElementById("d_reg_a_read_btn").onclick = function () {
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
            complete: function (response) {
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

    document.getElementById("stop_btn").onclick = function () {
        $.ajax({
            type: 'POST',
            url: '/stop_exp',
        });
        stopDataAcqusition();
        return false;
    };

    document.getElementById("d_reg_a_btn").onclick = function () {
        document.getElementById("d_reg_a_reg_num").value = "";
        document.getElementById("d_reg_a_data_in").value = "";
        document.getElementById("d_reg_a_data_out").textContent = "";
        return false;
    };

    document.getElementById("read_from_reg_btn").onclick = function () {
        $.ajax({
            type: 'GET',
            url: '/read_regs',
            complete: function (response) {
                json_obj = JSON.parse(response.responseText);

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

    /**Set Global limits*/
    document.getElementById("d_limit_a_write_btn").onclick = function () {

        var LimitQuantity = 8;
        var formData = {};
        var formLimit = [];
        var formDataReady = [];

        var limit1 = document.getElementById("limit_1").value;
        formLimit.unshift(limit1);

        var limit2 = document.getElementById("limit_2").value;
        formLimit.unshift(limit2);

        var limit3 = document.getElementById("limit_3").value;
        formLimit.unshift(limit3);

        var limit4 = document.getElementById("limit_4").value;
        formLimit.unshift(limit4);

        var limit5 = document.getElementById("limit_5").value;
        formLimit.unshift(limit5);

        var limit6 = document.getElementById("limit_6").value;
        formLimit.unshift(limit6);

        var limit7 = document.getElementById("limit_7").value;
        formLimit.unshift(limit7);

        var limit8 = document.getElementById("limit_8").value;
        formLimit.unshift(limit8);


        for (var i = 0; i <= LimitQuantity; i++) {
            if (i == LimitQuantity) {
                formData["regNum"] = parseInt('0x' + 260);//parseInt('0x' + 260); //260 ox608
                formData["dataIn"] = parseInt('0x' + 80);//parseInt('0x' + 80);; //80 ox128
                formDataReady.push(JSON.parse(JSON.stringify(formData)));
            }
            else {
                formData["regNum"] = parseInt('0x' + 304);//304
                formData["dataIn"] = parseInt('0x' + i);//i
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"] = parseInt('0x' + 305);//305
                formData["dataIn"] = parseInt(Number(formLimit.pop()));
                formDataReady.push(JSON.parse(JSON.stringify(formData)));

                formData["regNum"] = parseInt('0x' + 260);//260
                formData["dataIn"] = parseInt('0x' + 40);//40
                formDataReady.push(JSON.parse(JSON.stringify(formData)));
            }
        }

        console.log(formDataReady);

        ajaxSendDataAll(0, formDataReady);

        return false;
    };

    /**Individual limits*/
    document.getElementById("d_ilimit_a_write_btn").onclick = function () {
        var numChip = getDACChip(document.getElementById("select_chip").options.selectedIndex);
        //console.log(document.getElementById("select_chip").options.selectedIndex);

        if (document.getElementById("select_chip").options.selectedIndex == 0) {
            toastr.error('Введите номер чипа!!!');
        }

        var limitTHR = DataFormRead();
        var numChipAr = [];

        numChipAr.push(numChip);

        formTHR(numChipAr, limitTHR);
    };

    document.getElementById("d_ilimit_all_btn").onclick = function () {
        var limitTHR = DataFormRead();
        var dataIn = [];

        var numChip = numChipAutoGen();

        for (i = 0; i < 12; i++) {
            for (j = 0; j < 24; j++) {
                dataIn.push(limitTHR[j]);
            }
        }

        formTHR(numChip, dataIn);
    };

    /**For one chip, the number of thresholds = 24 and they can be displayed on the screen */
    document.getElementById('input').addEventListener('change', function (e) {
        let file = document.getElementById('input').files[0];

        (async () => {
            const fileContent = await file.text();

            var data_load = fileContent.split(" ");

            data_load = data_load.filter(function (x) {
                if ((x !== '\n') && (x !== ' ') && (x !== '-')) {
                    return x;
                }
            });

            console.log("DataFromFile", data_load);

            var numChip = numChipAutoGen();

            if (data_load.length == 24) {
                THRLoad(data_load);
            } else {
                formTHR(numChip, data_load);
            }


        })();
    });

    document.getElementById("limit_save_file").onclick = function () {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var day = now.getDate();
        var hours = now.getHours();
        var minutes = now.getMinutes();

        var numChip = document.getElementById("select_chip").options.selectedIndex;

        var fileName = 'LIMIT' + '_' + 'Chip' + numChip + '_' + hours + '_' + minutes + '_' + day + '_' + month + '_' + year;
        var fileString = '';

        limitTHR = DataFormRead();
        limitTHR.splice(2, 0, '-', '-');
        limitTHR.splice(6, 0, '-', '-');
        limitTHR.splice(18, 0, '-', '-');
        limitTHR.splice(22, 0, '-', '-');


        var data_arr = []

        for (var i = 0; i < 8; i++) {
            data_arr.push([]);
            data_arr[i].push(new Array(4));

            for (var j = 0; j < 4; j++) {
                data_arr[i][j] = limitTHR[j + i * 4];
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


    function drawChar(data_x, data_y, chipNum, chNum, chSen) {
        var ctx = document.getElementById("graph_data").getContext("2d");
        ctx.canvas.width = 600;
        ctx.canvas.height = 600;
        ctx.clearRect(0, 0, 600, 600);

        let chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data_x,
                datasets: [{
                    label: 'Counting characteristic '+ 'Chip '+ chipNum + ' Channel '+ chNum + ' Channel of sensor '+ chSen,
                    backgroundColor: 'transparent',
                    borderColor: 'green',
                    data: data_y
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            min: 0,
                            max: 100,
                            beginAtZero: true,
                        }
                    }
                    ]
                },
                responsive: false,
            }
        });
        return 0;

    }


    function drawGis(data_x, data_y) {
        var ctx = document.getElementById("graph_data").getContext("2d");
        ctx.canvas.width = 600;
        ctx.canvas.height = 600;
        ctx.clearRect(0, 0, 600, 600);

        let chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data_x,
                datasets: [{
                    label: 'Histogram of output values',
                    backgroundColor: 'blue',
                    borderColor: 'blue',
                    data: data_y
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            min: 0,
                            max: 100,
                            beginAtZero: true,
                        }
                    }
                    ]
                },
                responsive: false,
            }
        });
        return 0;

    }
    
    function sensorRec(chIn, mode){ //mode=0 electronic->sensor, mode=1 sensor->electronic
        var chOut=0;
        if (mode==0){
            if (chIn<48){chOut=2*chIn;}
            else if(chIn>=48){chOut=(95-chIn)*2+1;};
        };

        if (mode==1){
            for (var i=1;i<96;i++){
                if (i%2==0){chOut==chIn/2};
                if (i%2==1){chOut==(95-(i-1)/2)};
            }
        };
        
        return chOut;
    }

    document.getElementById("d_add_countch_btn").onclick = function () {
        var data_ch = [];
        data_x = [];
        fullDataforPlot = [];
        var count_num = 0;
        var count_lim = 0;
    
    
        var chipnum = Number(document.getElementById("chip_num").value);
        var chip_num = getDACChip(Number(document.getElementById("chip_num").value));
        var chlim_num = getDACChannel(Number(document.getElementById("ch_num").value), Number(document.getElementById("lim_num").value));
        var ch_num = chip_num + chlim_num;
    
        var counter_num;
        var thr_num;
    
        var c_num = Number(document.getElementById("count_number").value);
        var st_num = Number(document.getElementById("step_number").value);
        var mode;
        var send_data;//formCalDataGlim or formCalDataIlim
    
        var thrSend = [];
    
        if (document.getElementById("gllim_radio").checked == true) {
            mode = 7;
            for (var i = 0; i < 256; i = i + st_num) {
                thrSend.push(i);
            };
            send_data = formGTHR(thrSend);
            thr_num = Math.round(256 / st_num);//for ind 64
        };
    
        if (document.getElementById("inlim_radio").checked == true) {
            mode = 4;
            for (var i = 0; i < 64; i = i + st_num) {
                thrSend.push(i);
            };
            send_data = formITHR(ch_num, thrSend);
            counter_num = getCounterNumber(Number(document.getElementById("ch_num").value), Number(document.getElementById("lim_num").value));
            console.log("Count num", counter_num);
            thr_num = Math.round(64 / st_num);//for ind 64
        };
    
        console.log("Chan, Chip", chip_num, ch_num, chipnum, firstElemData(chipnum), counter_num);
        var acDatasum = 0;
        var acDataSum = [];
        var data_chSum = 0;
        fullDataArray = [];
        var dataSendValid = 0;
        var k = 0;
        let DataTimer = setTimeout(async function dtick() {
    
            if (count_num == 0) {
                document.getElementById("status_mes").value = "Calculating characteristics THR " + count_lim * st_num;
                sendCalData(count_lim, send_data, mode);
                acDatasum = 0;
                data_chSum = 0;
                fullData = [];
                count_num = count_num + 1;
                console.log("Data send");
            }
    
            if (count_num == c_num + 1) {
    
                if (mode == 4) {
                    data_x.push(JSON.stringify(send_data[4 * count_lim + 1].dataIn));
                    for (var i = 0; i < data_ch.length; i++) {
                        acDatasum = acDatasum + data_ch[i];
                        if (i == data_ch.length - 1) {
                            fullDataforPlot.push(acDatasum / c_num);
                        }
                    }
                }
    
                if (mode == 7) {
                    data_x.push(JSON.stringify(send_data[7 * count_lim + 1].dataIn));
                    acDataSum = get2dimensional(data_ch, 100);
                    for (var i = 0; i < acDataSum[0].length; i++) {
                        for (var j = 0; j < acDataSum.length; j++) {
                            acDatasum = acDatasum + acDataSum[j][i];
                        }
                        fullDataforPlot.push(acDatasum / c_num);
                        acDatasum = 0;
                    }
                }
    
                count_num = 0;
                dataSendValid = 0;
                thr_num = thr_num - 1;
                count_lim = count_lim + 1;
                data_ch = [];
                acDataSum = [];
                console.log("Current value", count_num, thr_num, count_lim);
    
            }
    
            if (dataSendValid != count_num) {
                dataSendValid = count_num;
                acqDataReq();
            };
            //console.log(fullDataArray);
            if (fullDataArray.length != 0) {
    
                if (mode == 4) {
                    data_ch.push(fullDataArray[firstElemData(chipnum) + c_num - 1]);
                    console.log(firstElemData(chipnum) + c_num - 1, fullDataArray, c_num);
                }
    
                if (mode == 7) {
                    for (var i = 0; i < 100; i++) {
    
                        if (k == 97) { data_ch.push(Math.round(data_chSum / 89)); } else {//count characteristics of detector (89=97-4 high noise-4 empty)
                            data_ch.push(fullDataArray[k]);
                            //console.log(k,data_ch);
    
                            if ((k == 24) || (k == 32) || (k == 40) || (k == 88)) { data_chSum += 0; } else {//high-noise channels
                                data_chSum += data_ch[i + 100 * (count_num - 1)];
                            }
                            //console.log(data_chSum);
                        }
                        if (k == 99) { k = 0 } else { k = k + 1 };
                    }
                }
                data_chSum = 0;
                fullDataArray = [];
                console.log("This mass", count_num, data_ch, data_ch.length);
                count_num = count_num + 1;
                //console.log("DataSend", dataSendValid, count_num)
            };
    
            if (thr_num > 0) DataTimer = setTimeout(dtick, 0.5);
    
            if (thr_num == 0) {
                if (mode == 7) {
                    fullDataforPlot = get2dimensional(fullDataforPlot, 100);
                    fullDataforPlotGl = r2c(fullDataforPlot);
                    console.log(fullDataforPlot, fullDataforPlotGl);
                }
            }
    
        }, 0.5);
    
    };

    document.getElementById("d_draw_save_btn").onclick = function () {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var day = now.getDate();
        var hours = now.getHours();
        var minutes = now.getMinutes();

        var numChip = document.getElementById("chip_num").value;
        var numChan = document.getElementById("ch_num").value;
        var numCh = document.getElementById("lim_num").value;

        var fileName = 'Char' + '_' + 'Chip' + numChip + '_' + 'Channel' + numChan + '_' + 'Limit' + numCh + '_' + hours + '_' + minutes + '_' + day + '_' + month + '_' + year;
        var fileString = '';

        data_arr = []

        for (var i = 0; i < fullDataforPlot.length; i++) {

            //fileString += 'x ' + data_x[i] + ' ' +'y ' + fullDataforPlot[i];
            fileString += fullDataforPlot[i];
            fileString += ' \n';
        }

        var file = new File([fileString], fileName, { type: "text/plain;charset=utf-8" });
        saveAs(file, fileName);

        return false;
    };

    function getDataforGis(datacount, chnum, chip_num, count, data_x) {
        var dataSendValid = 0;
        var sum = 0;
        var datach = [];
        var datachmod = [];

        //var data_x=[1,2,3,4,5,6,7,8];
        fullDataArray = [];

        let DataSendTimer = setTimeout(async function dstick() {

            if (dataSendValid != datacount) {
                dataSendValid = datacount;
                acqDataReq();
            }

            if (fullDataArray.length != 0) {
                datacount = datacount - 1;

                for (var i = 0; i < count; i++) {
                    datach.push(fullDataArray[firstElemData(chip_num) + chnum[i]]);
                    console.log("Data for channes", datach, firstElemData(chip_num) + chnum[i]);
                }
            }


            if (datacount != 0) {
                DataSendTimer = setTimeout(dstick, 0.5);
            }

            if (datacount == 0) {
                datachmod = r2c(get2dimensional(datach, count));
                console.log("Datacmod", datach, datachmod);
                for (var i = 0; i < datachmod.length; i++) {
                    for (var j = 0; j < datachmod[0].length; j++) {
                        sum = sum + datachmod[i][j];
                        //console.log(sum);
                    }
                    fullDataforGis.push(sum / datacount);
                    sum = 0;
                    //console.log(fullDataforGis);
                }
                drawGis(data_x, fullDataforGis);
                console.log(data_x, fullDataforGis);
            }

        }, 0.5);
        return false;
    };

    document.getElementById("d_draw_btn").onclick = function () {
        var countdata = Number(document.getElementById("caldata_number").value);
        var chip_num = Number(document.getElementById("chip_num").value);
        var chNum=Number(document.getElementById("ch_num").value);
        var chip_ch=firstElemData(chip_num)+chNum-1;
        var chSensor=sensorRec(chip_ch,0);

        if ((document.getElementById("plot_radio").checked == true) && (document.getElementById("gllim_radio").checked == true)) {
            drawChar(data_x, fullDataforPlotGl[chip_ch], chip_num, chNum, chSensor);
            console.log(data_x, chip_ch, fullDataforPlotGl[chip_ch],chSensor);
        }
    
        if ((document.getElementById("plot_radio").checked == true) && (document.getElementById("inlim_radio").checked == true)) {
            drawChar(data_x, fullDataforPlotGl[chip_ch], chip_num, chNum, chSensor);
            console.log(fullDataforPlotGl, chip_num, chNum, fullDataforPlotGl[chip_ch] );
        }
    
        if (document.getElementById("gis_radio").checked == true) {
            data_x = [];
            fullDataforGis = [];
            var chnum = [];
            for (var i = 0; i < 8; i++) {
                data_x.push(i + 1);
                chnum.push(i) + 1;
            }
    
            console.log("Chnum", chnum, firstElemData(chip_num), data_x);
            getDataforGis(countdata, chnum, chip_num, 8, data_x);
        }
        return false;
    };

    document.getElementById("d_autolimit_btn").onclick = function () {

        var st_num = Number(document.getElementById("step_number").value);
        var ch_start=sensorRec(Number(document.getElementById("ch_start").value),1);
        var ch_stop=sensorRec(Number(document.getElementById("ch_stop").value),1);
        //var ch_start=Number(document.getElementById("ch_start").value);
        //var ch_stop=Number(document.getElementById("ch_stop").value);
        console.log("Window char", ch_start, ch_stop);
        var dataforProc=[];
        
        for (var i=ch_start; i<ch_stop;i++){
            dataforProc.push(fullDataforPlotGl[i]);
        }
    
        console.log("DataforProc",fullDataforPlot,dataforProc);
    
        var thrSend = [];
        for (var i = 0; i < 256; i = i + st_num) {
            thrSend.push(i);
        }
    
        var dataforanalysis = [];
        fullDataArray = [];
        var LocTHR = [];
    
        document.getElementById("status_mes").value = "Automatic calibration of thresholds";   
        dataforanalysis = dataProc(dataforProc, st_num);
        console.log("DataForAn", dataforanalysis);
        LocTHR = Slide_Window(dataforanalysis);
        THRsent(LocTHR);
    
        //Decomposition of characteristics by thresholds
        function dataProc(dataforProc, deltagllim) {
            var prociter = 0;
            if (deltagllim > 1) prociter = Math.log2(deltagllim) - 1;//how many iteration for localize should do
    
            document.getElementById("status_mes").value = "THR processing. Search for 50 percent of counts";
        
            var dataRef = 0.5 * Number(document.getElementById("ref_number").value);
            console.log("DataRef", dataRef);
    
            var datamax50 = 0;
            var datamin50 = 0;
            var data50 = 0;
            var datachip = [];
    
            var datathrmin = 0;
            var datathrmax = 0;
            var datathr = 0;
            var lim_num = [];
            
            console.log("DataforProc", dataforProc);

            //Seach 50% for each channels
    
            for (var i = 0; i <= 256 / deltagllim; i++) { lim_num.push(deltagllim * i) };
            console.log("Lim_num", lim_num, Math.round(50 / deltagllim) + 1);
    
            //for (var l = 1; l < 13; l++) {
    
                //for (var i = 8 * (l - 1); i < 8 * l; i++) {
                for (var i=ch_start; i<ch_stop+1;i++){
    
                    //Searh
                    for (var j = Math.round(50 / deltagllim) + 1; j < dataforProc[0].length; j++) {//Math.round(50/deltaglim)+1 is how many points are given to the noise in the channels
                        datamax50 = 0;
                        datamin50 = 0;
                        datathrmax = 0;
                        datathrmin = 0;
                        if ((dataforProc[i][j] < dataRef) && (dataforProc[i][j] > datamin50)) {
                            datamin50 = dataforProc[i][j];
                            datathrmin = lim_num[j];
                            console.log("DataTRH1", i, j, datathrmin);
                            if (dataforProc[i][j + 1] > dataRef) {
                                datamax50 = dataforProc[i][j + 1];
                                datathrmax = lim_num[j + 1];
                            }
                            else {
                                if (j == 0) { datamax50 = 0; } else {
                                    datamax50 = dataforProc[i][j - 1];
                                    datathrmax = lim_num[j - 1];
                                }
                            }
                            break;
    
                        }
                    }
                    data50 = (datamax50 - datamin50) / 2 + datamin50;
                    console.log("50 Counts data", l, i, j, datamin50, datamax50, data50);
    
                    if (j == 31) { datathr = datathrmin }
                    else { datathr = Number(datathrmin + (datathrmax - datathrmin) / 2) }
                    console.log("Data 1 iter", j, data50, datathr, datathrmin, datathrmax);
    
                    //Fit
                    for (var k = 0; k < prociter; k++) {
                        if (data50 < dataRef) {
                            datamin50 = data50;
                            datathrmin = datathr;
                            data50 = (datamax50 - datamin50) / 2 + datamin50;
                            //console.log("Ctrl-", datathr, datathrmax);
                            datathr = datathrmin + (datathrmax - datathrmin) / 2;
                            //console.log("Nextfit-", data50, datathr,datathrmax, datathrmin);
                        } else {
                            datamax50 = data50;
                            datathrmax = datathr;
                            data50 = (datamax50 - datamin50) / 2 + datamin50;
                            //console.log("Ctrl+", datathr, datathrmin);
                            datathr = datathrmin + (-datathrmin + datathrmax) / 2;
                            //console.log("Nextfit+", data50, datathr,datathrmax, datathrmin);
                        }
                    }
                    //console.log("Nextfit", data50, datathr);
                    datachip.push(datathr);
                    console.log("THR mass", datachip);
                }
            //}
            return datachip;
    
        }
    
        function Slide_Window(dataforanalysis) {
            var window = 32;
            var thrrange = [];
            var slidewin = [];
            var datarange = [];
    
            document.getElementById("status_mes").value = "THR processing. Autocaribration";
    
            for (var i = 0; i < 256; i++) { thrrange.push(i); }
    
            for (var i = 0; i < 257 - window; i++) { slidewin.push(thrrange.slice(i, i + window)); }
    
            for (var i = 0; i < slidewin.length; i++) { datarange.push(0); }
    
            console.log("THRrange", thrrange);
            console.log("SlideWin", slidewin, slidewin[0].length, slidewin[0][window - 1]);
            console.log("DataRange", datarange);
            console.log("Data", dataforanalysis);
    
            for (var i = 0; i < slidewin.length; i++) {
                for (var k = 0; k < dataforanalysis.length; k++) {
                    if (dataforanalysis[k] >= slidewin[i][0] && dataforanalysis[k] <= slidewin[i][window - 1]) { datarange[i] += 1; }
                }
            }
            console.log("DataRange2", datarange, Math.max.apply(null, datarange));
    
            var datarangemax = Math.max.apply(null, datarange);
            var dataint = [];
            var datathav = 0;
    
            for (var i = 0; i < datarange.length; i++) {
                if (datarange[i] == datarangemax) {
                    dataint.push(i);
                }
            }
            console.log("DataInt", dataint);
            console.log(slidewin[dataint[0]][0], slidewin[dataint[0]][window - 1]);
    
            datathav = slidewin[dataint[0]][0];
    
            console.log("DataAv", datathav);
    
            var datarange_an = [];
            var datarange_anch = [];
            for (var i = 0; i < dataforanalysis.length; i++) {
                if (slidewin[dataint[0]][0] <= dataforanalysis[i] && dataforanalysis[i] <= slidewin[dataint[dataint.length - 1]][window - 1]) {
                    datarange_an.push(dataforanalysis[i]);
                    datarange_anch.push(i);
                }
            }
            console.log("Datarange", datarange_an, datarange_anch, slidewin[dataint[0]][0], slidewin[dataint[dataint.length - 1]][window - 1]);
            var deltaTHR = [];
            var deltaTHRwhAv = [];
            var deltaTHRwhAvCh = [];
            var LTHR = [];
            var coef = 2.133;
            var maxLTHR = 63 / coef;
    
            for (var i = 0; i < dataforanalysis.length; i++) {
                if (datarange_anch.includes(i) == false) {
                    if (dataforanalysis[i] < datathav) {
                        deltaTHRwhAv.push(Math.round(0));
                        deltaTHRwhAvCh.push(i);
                    } else {
                        deltaTHRwhAv.push(Math.round(coef * (maxLTHR)));
                        deltaTHRwhAvCh.push(i);
                    }
                }
            };
    
            for (var i = 0; i < datarange_an.length; i++) {
                if (datarange_an[i] > datathav) {
                    if ((Math.abs(coef * (datathav - datarange_an[i]))) > 63) {
                        deltaTHR.push(Math.round(coef * (maxLTHR)));
                    } else {
                        deltaTHR.push(Math.round(Math.abs(coef * (datathav - datarange_an[i]))));
                    }
                }
                else (deltaTHR.push(0));
            };
    
            console.log("DeltaTHR", deltaTHR, deltaTHRwhAv, deltaTHRwhAvCh);
    
            for (var i = 0; i < 96; i++) {
                if (datarange_anch.includes(i) == true) {
                    LTHR.push(deltaTHR[datarange_anch.indexOf(i)]);
                    //console.log("Corr",datarange_anch.indexOf(i),deltaTHR[datarange_anch.indexOf(i)]);
                }
                else if (deltaTHRwhAvCh.includes(i) == true) {
                    LTHR.push(deltaTHRwhAv[deltaTHRwhAvCh.indexOf(i)]);
                    //console.log("CorrNot",deltaTHRwhAvCh.indexOf(i),deltaTHRwhAv[deltaTHRwhAvCh.indexOf(i)]);
                }
            }
            console.log("LTHR", LTHR);
            return LTHR;
        }
    
        /**If mode==32, then a list is generated for saving to a file, 
         * if mode==24 for uploading to the detector */
        function THRform(dataIn, mode) {
    
            var data_load = [];
            var fullDataLoad = [];
    
            for (var k = 1; k < 13; k++) {
                data_load = [];
                for (var i = 0; i < 8; i++) {
                    data_load[2 * i] = dataIn[8 * (k - 1) + i];
                    data_load[2 * i + 1] = 0;
                }
                data_load.splice(5, 0, 0, 0);
                data_load.splice(9, 0, 0, 0);
                data_load.splice(17, 0, 0, 0);
                data_load.splice(21, 0, 0, 0);
    
                if (mode == 32) {
                    data_load.splice(2, 0, '-', '-');
                    data_load.splice(6, 0, '-', '-');
                    data_load.splice(18, 0, '-', '-');
                    data_load.splice(22, 0, '-', '-');
                }
    
                if (mode==24){
                    console.log("THR Load");
                }else{
                    console.log("THR Save");
                }
                for (var i = 0; i < mode; i++) {
                    fullDataLoad.push(data_load[i]);
                };
    
                console.log("DataLoad", data_load, k, fullDataLoad);
    
                if (k == 12) {
                    document.getElementById("status_mes").value = "Autocalibration ready";
                };
            };
    
            return fullDataLoad;
    
        }
    
        function THRsent(LocTHR) {
            var fullDataLoad = THRform(LocTHR, 24);
            var fullDataFile = THRform(LocTHR, 32);
            var numChip = numChipAutoGen();
    
            formTHR(numChip, fullDataLoad);
            AutoTHRSave(fullDataFile, 12);
            return false;
    
        }
    
    };

    document.getElementById("d_iautolimit_btn").onclick = function () {
        document.getElementById("status_mes").value = "Calculation of thresholds";

        var mode = 0;

        if (document.getElementById("channel13_radio").checked == true) {
            mode = 1;
            document.getElementById("limit_2").value = 255;
            document.getElementById("limit_4").value = 255;
        };

        if (document.getElementById("channel24_radio").checked == true) {
            mode = 2;
        };

        console.log("Mode", mode);

        var chipnum = Number(document.getElementById("chip_num").value);
        var c_num = Number(document.getElementById("count_number").value);
        var st_num = Number(document.getElementById("step_number").value);
        var countdata = Number(document.getElementById("caldata_number").value);

        var data_ch = [];
        var count_num = 0;
        var count_lim = 0;

        var chlim_num = getDACChannel(Number(document.getElementById("ch_num").value), Number(document.getElementById("lim_num").value));
        var ch_num = chipnum + chlim_num;

        var counter_num = [];
        var send_data = [];

        fullDataforGis = [];

        counter_num = getCounterNumber(Number(document.getElementById("ch_num").value), Number(document.getElementById("lim_num").value));
        console.log("Count num", counter_num);

        thrSend=[];
        for (var i = 0; i < 64; i = i + st_num) {
            thrSend.push(i);
        };
        send_data = formITHR(ch_num, thrSend);

        var thr_num = Math.round(64 / st_num);
        var acDatasum = 0;

        fullDataArray = [];
        var dataSendValid = 0;
        var datachav = [];
        var dataforProc = [];
        var lim_num = [];
        var ThrLimInst = [];
        var ThrCalc = [];
        var ThrCalcFirst = [];
        var ThrCalcFirstFull = [];
        var data_x = [];

        var data13 = ["Thr1Ch1", "Thr1Ch2", "Thr1Ch3", "Thr3Ch3", "Thr1Ch4", "Thr3Ch4", "Thr1Ch5", "Thr1Ch6", "Thr1Ch7", "Thr3Ch7", "Thr1Ch8", "Thr3Ch8"];
        var data24 = ["Thr2Ch1", "Thr2Ch2", "Thr2Ch3", "Thr4Ch3", "Thr2Ch4", "Thr4Ch4", "Thr2Ch5", "Thr2Ch6", "Thr2Ch7", "Thr4Ch7", "Thr2Ch8", "Thr4Ch8"];

        if (mode == 2) {
            ThrCalcFirstFull = DataFormRead();
            var k = 0;
            for (var i = 0; i < (ThrCalcFirstFull.length) / 2; i++) {
                ThrCalcFirst.push(Number(ThrCalcFirstFull[2 * i]));
            }
        };
        console.log("THR Full", ThrCalcFirstFull, ThrCalcFirst);

        let DataTimer = setTimeout(async function dtick() {

            if (count_num == 0) {
                document.getElementById("status_mes").value = "Calculating characteristics THR " + count_lim * st_num;
                sendCalData(count_lim, send_data, 4);
                acDatasum = 0;
                count_num = count_num + 1;
                console.log("Data send");
            }

            //Calculation of average values at a single threshold in channels                
            if (count_num == c_num + 1) {
                lim_num.push(JSON.stringify(send_data[4*count_lim + 1].dataIn));
                console.log("Data Lim", lim_num);

                for (var i = 0; i < data_ch.length; i++) {
                    acDatasum = acDatasum + data_ch[i];
                    if (i == data_ch.length - 1) {
                        dataforProc.push(acDatasum / c_num);
                    }
                    console.log("Data Sum", acDatasum, dataforProc);
                    acDatasum = 0;
                }
                count_num = 0;
                dataSendValid = 0;
                thr_num = thr_num - 1;
                count_lim = count_lim + 1;
                data_ch = [];
                datachav = [];

            }

            if (dataSendValid != count_num) {
                dataSendValid = count_num;
                acqDataReq();
            };


            if (fullDataArray.length != 0) {
                console.log("Full Data", fullDataArray);

                data_ch.push(fullDataArray[firstElemData(chipnum) + c_num - 1]);

                fullDataArray = [];
                count_num = count_num + 1;
                console.log("This mass", count_num, data_ch);
            };

            if (thr_num != 0) DataTimer = setTimeout(dtick, 0.5);


            if (thr_num == 0) {
                ThrCalc = dataProc(dataforProc, lim_num, mode)
                if (mode == 1) {
                    for (var i = 0; i < 12; i++) {
                        ThrLimInst[2 * i] = ThrCalc[i];
                        ThrLimInst[2 * i + 1] = 31;
                        data_x = data13;
                    };
                };

                if (mode == 2) {
                    for (var i = 0; i < 12; i++) {
                        ThrLimInst[2 * i] = ThrCalcFirst[i];
                        ThrLimInst[2 * i + 1] = ThrCalc[i];
                        data_x = data24;
                    };
                };

                console.log(ThrLimInst);
                THRLoad(ThrLimInst);
                formTHR(chipnum, ThrLimInst);
                document.getElementById("status_mes").value = "Getting data and drawing histogram";
                getDataforGis(countdata, counter_num, chip_num, 12, data_x);
                dataforProc = [];
            };

        }, 0.5);


        //Decomposition of characteristics by thresholds
        function dataProc(dataforProc, lim_num, mode) {
            document.getElementById("status_mes").value = "THR processing";
            var dataThrLim = [];
            var datafifmin = 0;
            var datafifmax = 0;
            var lim50min = 0;
            var lim50max = 0;

            datachmod = r2c(get2dimensional(dataforProc, 12));
            console.log("Data Perform", dataforProc, datachmod);
            for (var i = 0; i < datachmod.length; i++) {
                for (var j = 0; j < datachmod[0].length; j++) {
                    console.log(datachmod[i][j], i, j);

                    if (mode == 1) {
                        if (datachmod[i][j] < 50 && datachmod[i][j] > datafifmin) {
                            datafifmin = datachmod[i][j];
                            if (datachmod[i][j + 1] > 50) { datafifmax = datachmod[i][j + 1]; }
                            else { datafifmax = datachmod[i][j - 1]; }
                            break;
                        };
                    };

                    if (mode == 2) {
                        if (i >= 6) {
                            if (datachmod[i][j] > 50) {
                                datafifmax = datachmod[i][j];
                                datafifmin = datachmod[i][j - 1];
                                break;
                            };

                        } else {
                            if (datachmod[i][j] < 50 && datachmod[i][j] > datafifmin) {
                                datafifmin = datachmod[i][j];
                                if (datachmod[i][j + 1] > 50) { datafifmax = datachmod[i][j + 1]; }
                                else { datafifmax = datachmod[i][j - 1]; }
                                break;
                            }
                        }

                    };

                };

                console.log("50 Counts data", datafifmin, datafifmax);
                console.log("50 Counts IndData", datachmod[i].indexOf(datafifmin), datachmod[i].indexOf(datafifmax));
                if (datachmod[i].indexOf(datafifmin) == -1 && datachmod[i].indexOf(datafifmax) == -1) {
                    lim50max = 126;
                    lim50min = 0;
                } else {
                    lim50min = Number(lim_num[datachmod[i].indexOf(datafifmin)]);
                    lim50max = Number(lim_num[datachmod[i].indexOf(datafifmax)]);
                }

                console.log("50 Counts lim", lim50min, lim50max);
                dataThrLim.push(lim50min + Math.round((lim50max - lim50min) / 2));

                console.log("THR", dataThrLim);
                datafifmin = 0;
                datafifmax = 0;
            }
            console.log("dataThrLim", dataThrLim);
            return dataThrLim;
        }

    }

});