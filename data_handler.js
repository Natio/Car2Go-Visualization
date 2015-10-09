function DataHandler(){
  this.isReady = false;
  this.data = null;
  this.grouping_interval = 10;
  this.min_date = null;
  this.max_date = null;
  this.group_bounds = null;
  this.number_bounds = null;
}


DataHandler.TYPE_DAY = "day";
DataHandler.TYPE_AREA = "area";
DataHandler.TYPE_DETAIL = "detail";


DataHandler.prototype.loadData = function(file, callback){
  var t = this;
  d3.csv(file).row(function(d){
    if(+d.duration > 3600) return null;
    return {
      row_start : +d.row_s,
      col_start : +d.col_s,
      row_end: +d.row_e,
      col_end: +d.col_e,
      duration : +d.duration,
      date : new Date((+d.timestamp)*1000),
      //car : d.car,
      distance : ((+d.distance)/1000)
    }
  }).get(function(error, rows) {
    if(typeof error != undefined && error != null){
      console.error(error);
      return;
    }

    var max_min = rows.reduce(function(previous, current){
      return {
        min : Math.min(previous.min, current.date),
        max : Math.max(previous.max, current.date)
      }

    },
    {
      max: new Date(1),
      min: new Date()
    }
    );

    t.min_date = new Date(max_min.min);
    t.max_date = new Date(max_min.max);
    t.data = rows;
    t.isReady = true;

    callback();

  });
}

DataHandler.prototype.drawDailyGraphs = function(day){

  var filtered_data = this.data.filter(function(d){
    var date = new Date(d.date);
    return day.getDate() == date.getDate()
        && day.getMonth() == date.getMonth()
        && day.getFullYear() == date.getFullYear()
  });
  this.drawGraphs(filtered_data, DataHandler.TYPE_DAY);
}

DataHandler.prototype.drawGraphs = function(data, type){

  this.drawMapGraph(data, type);
  this.drawAccessorGraphs(data, type);
}

DataHandler.prototype.drawMapGraph = function(data, type){
  var self = this;
  var map_data = d3.nest()
  .key(function(d){
    return d.row_start+","+d.col_start;
  }).key(function(d){
    return d.row_end+","+d.col_end;
  }).rollup(function(leaves){

    var leave = leaves[0];

    return {
      row_start : leave.row_start,
      col_start : leave.col_start,
      row_end: leave.row_end,
      col_end: leave.col_end,
      length:leaves.length,
      leaves: leaves
    }

  }).entries(data);


  var map_plot = new MapChart("#map_container");
  map_plot.bindData(map_data);
}


DataHandler.prototype.drawAccessorGraphs = function(data, type){
  var self = this;

  d3.selectAll(".d3-tip").remove();

  var distance_grouping_function = function(d){
    var dist = d.distance;
    if(dist <= 2) return 0;
    else if(dist <= 5) return 1;
    return 2;
  };

  var nested_data = d3.nest()
                    .key(function(d){ return Math.floor(d.date.getHours()); })
                    //.key(distance_grouping_function)
                    .rollup(function(leaves) {

                      var mean_duration = d3.mean(leaves, function(d){ return d.duration});
                      var mean_distance = d3.mean(leaves, function(d){ return d.distance});
                      return {
                        duration : parseInt((mean_duration/60).toFixed()),
                        items_count: parseInt(leaves.length),
                        distance : parseInt(mean_distance.toFixed(2))
                      };

                    }).entries(data);
/*
  nested_data = nested_data.map(function(item){
    var key = item.key;
    var values = item.values;
    var tot_items = [];

    var to_return = {};
    to_return.dist_type = [];

    for(var k = 0; k < values.length; k++){
      var current = values[k];
      var current_key = current.key;
      var current_values = current.values;
      to_return.dist_type[current_key] = current_values.length;
      extendArray(tot_items, current_values);
    }

    to_return.duration = parseInt((d3.mean(tot_items, function(d){ return d.duration})/60).toFixed());
    to_return.items_count = tot_items.length;

    return {key: key, values:to_return};

  });
*/
  var bands_data = d3.nest()
                  .key(function(d){
                    var minutes = (d.duration / 60).toFixed()
                    var x = Math.floor(minutes / self.grouping_interval);
                    return x;
                   })
                   .key(distance_grouping_function)
                  /*.rollup(function(leaves){

                    return leaves;

                  })*/.entries(data);
  bands_data = bands_data.map(function(item){
    var key = item.key;
    var values = item.values;
    var num_items = 0;
    var to_ret = {};
    var dist_type = [];
    var tot_items = [];

    for(var i = 0; i < values.length ; i++){
      var c = values[i];
      var k_i = c.key;
      var current_values = c.values;
      dist_type[k_i] = current_values.length;
      num_items += current_values.length;
      extendArray(tot_items, current_values);
    }
    to_ret.values = {};
    to_ret.values.dist_type = dist_type || [];
    to_ret.length = num_items;
    to_ret.raw = tot_items;
    to_ret.key = key;
    return to_ret;
  });

  var y_accessors = {
    zero: function(d){
       var x = d.values.dist_type["0"];
       return typeof x === "undefined" ? 0 : x;
       },
    one: function(d){
       var x = d.values.dist_type["1"];
       return typeof x === "undefined" ? 0 : x;
       },
    two: function(d){
       var x = d.values.dist_type["2"];
       return typeof x === "undefined" ? 0 : x;
       },
  };

  var y_accessors_time = {
    zero: function(d){
      return d.values.duration;
    },
    one: function(d){return 0;},
    two: function(d){return 0;}
  }

  var bc = new BarChart("Hours of day", "# of rentals", "#no_rentals");

  var x_domain = [];
  for(var i = 0; i< 24;i++){
    //x_domain.push((i)+"-"+(i+1));
    x_domain.push(i);
  }

  var x_distribution = function(d){
    //var k = parseInt(d.key);
    //return k+"-"+(k+1);
    return d.key;
  };

  bc.setX_domain(x_domain);

  if(type == DataHandler.TYPE_DAY){
    this.number_bounds_day = [0, d3.max(nested_data, function(d){ return d.values.items_count;})];
    this.group_bounds_day = [0, d3.max(bands_data, function(d){ return d.length; })];
  }

  this.number_bounds = this.number_bounds_day;
  this.group_bounds = this.group_bounds_day;

  if((!$('#maintain_scale').is(':checked') || this.group_bounds == null || this.number_bounds == null)){
    this.number_bounds = [0, d3.max(nested_data, function(d){ return d.values.items_count;})];
    this.group_bounds = [0, d3.max(bands_data, function(d){ return d.length; })];
  }

  bc.setY_domain(this.number_bounds);
  bc.bindData(nested_data,x_distribution,function(d){ return d.values.items_count;});


  var bar_time = new BarChart("Hours of day", "Avg time(min)", "#avg_time");
  bar_time.setX_domain(x_domain);

  bar_time.setY_domain([0, d3.max(nested_data, function(d){return d.values.duration;})]);
  bar_time.bindData(nested_data, x_distribution,function(d){return d.values.duration;});



  var bar_bands = new StackedBarChart("Time intervals (min)", "# of rentals", "#time_groups");
  bar_bands.setY_domain(this.group_bounds);

  var bands_x_domain = [];
  var band_max = d3.max(bands_data, function(d){return parseInt(d.key);});
  for(var i = 0; i <= band_max; i++){
    bands_x_domain.push(i*this.grouping_interval+"-"+(i+1)*this.grouping_interval);
  }

  bar_bands.setX_domain(bands_x_domain);
  bar_bands.bindData(bands_data,
    function(d){
      var key =  parseInt(d.key);
      return (key*self.grouping_interval)+"-"+((key+1)*self.grouping_interval);
    },
    y_accessors);


}
