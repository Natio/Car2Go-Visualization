function MapChart(map_container){
  var margin = {top: 20, right: 50, bottom: 10, left: 70};
  this.margin = margin;
  this.width = 600 - margin.left - margin.right,
  this.height = 611 - margin.top - margin.bottom;

  this.x = d3.scale.linear().range([0, this.width]);
  this.y = d3.scale.linear().range([this.height, 0]);
  this.x.domain([0,9]);
  this.y.domain([0,9]);

  d3.select(map_container).selectAll("*").remove();
  this.svg = d3.select(map_container).append("svg")
    .attr("width", "600")
    .attr("height", "745")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}


MapChart.prototype.bindData = function(data){
  var self = this;


  var minmax = null;
  (function(){
    minmax = data.reduce(function(prev, curr){
      prev.min = Math.min(prev.min, curr.values.length);
      prev.max = Math.max(prev.max, curr.values.length);
      return prev;
    }, {min: Number.MAX_VALUE, max:Number.MIN_VALUE});

  })();

  var circle_scale = d3.scale.linear().range([3, 15]);
  circle_scale.domain([minmax.min, minmax.max]);

  var minmax_stroke = null;

  var dot = this.svg.selectAll(".circle").data(data).enter().append("g").attr("class", "circle_group");

  var click_handler = function(){

    var storage = [];
    var data = this.__data__;
    for(i in data.values){
      var obj = data.values[i];
      for(j in obj.values.leaves){
        var obj_j = obj.values.leaves[j];
        storage.push(obj_j);
      }
    }
    window.data_handler.drawAccessorGraphs(storage, DataHandler.TYPE_AREA);
  };


  dot.append("circle")
      .attr("class", "circle")
      .attr("r", function(d){return circle_scale(d.values.length)})
      //.attr("fill", "#58355E")
      .attr("cx", function(d){
        var row = parseInt(d.key.split(",")[1]);
        return self.x( row ) + 10;
        })
      .attr("cy", function(d){
        var col = parseInt(d.key.split(",")[0]);
        return self.y(col) ;
      }).on("mouseenter",click_handler)/*.on('mouseleave', function(){
        window.data_handler.drawAccessorGraphs(window.data_handler.filtered_data);
      })*/;

  var linesGroup = dot.append("g").selectAll("g").data(function(d){
     return d.values;
   }).enter();

   linesGroup.append("line")
   .attr("class", "line")
   .attr("stroke","#fe5d26")
   .attr("style", "stroke-width:2px")
   .attr("x1", function(d){
     return self.x(d.values.col_start) + 10;
   })
   .attr("y1", function(d){
     return self.y(d.values.row_start);
   })
   .attr("x2", function(d){
     return self.x(d.values.col_end) + 10;
   })
   .attr("y2", function(d){
     return self.y(d.values.row_end);
   }).on("click",click_handler);


}


function BarChart(labelX, labelY, item_to_append){
  item_to_append = typeof item_to_append === "undefined" ? "document" : item_to_append;
  this.labelX = labelX;
  this.labelY = labelY;
  this.margin = {top: 10, right: 20, bottom: 30, left: 45};
  this.width = 640 - this.margin.left - this.margin.right,
  this.height = 200 - this.margin.top - this.margin.bottom;

  this.x = d3.scale.ordinal()
  .rangeRoundBands([0, this.width], .1);

  this.y = d3.scale.linear()
  .range([this.height, 0]);

  this.xAxis = d3.svg.axis()
  .scale(this.x)
  .orient("bottom");

  this.yAxis = d3.svg.axis()
  .scale(this.y)
  .orient("left");
  //.ticks(10, "");

  d3.select(item_to_append).selectAll("*").remove();
  this.svg = d3.select(item_to_append).append("svg")
  .attr("class","chart")
  .attr("width", this.width + this.margin.left + this.margin.right)
  .attr("height", this.height + this.margin.top + this.margin.bottom)
  .append("g")
  .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");


}

BarChart.prototype.setX_domain = function(domain){
  this.x.domain(domain);
}

BarChart.prototype.setY_domain = function(domain){
  this.y.domain(domain);
}

BarChart.prototype.drawStackItem = function(data, key, value, y, height, css_class){
  var self = this;

  css_class = typeof css_class === "undefined" ? "" : css_class;

  var bar = this.svg.selectAll(".barZ")
  .data(data)
  .enter().append("g").attr("class","bar "+css_class);


  var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return "<span style='color:white'>" + value(d) + "</span>";
  });

  if(data.length > 0){
    bar.call(tip);
  }


  bar.append("rect")
  .attr("class","bar "+css_class)
  .attr("x", function(d) {
    return self.x(key(d));
    })
  .attr("width", self.x.rangeBand())
  .attr("y", y)
  .attr("height", height)
  .on('mouseover', tip.show)
  .on('mouseout', tip.hide)
  .on('click', function(){
    if(self.type != "stacked"){
      return;
    }
    var data = this.__data__;
    tip.hide.apply(tip, arguments);
    window.data_handler.drawGraphs(data.raw, DataHandler.TYPE_DETAIL);
  });

  bar.append("text")
  .attr("x", function(d) {
    return self.x(key(d)) + 2;
    })
  .attr("y", function(d){
    if(height(d) < 12){
      d3.select(this).attr("style", "display:none;");
    }
    var offset = y(d);
    //var textY = self.height - self.margin.bottom - offset;
    return offset + (height(d)/2) + 4;//+  (textY > -20 ? + 10 : -3 );
    })
  .text(function(d){
    var v = value(d);
    if(v == 0){
      return "";
    }
    return v;
  });
}

BarChart.prototype.drawAxes = function(){

  this.svg.append("g")
  .attr("class", "y axis")
  .call(this.yAxis)
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", -35)
  .attr("x", -this.height/1)
  .attr("class", "axis_label")
  .attr("dy", ".71em")
  .text(this.labelY);

  this.svg.append("g")
  .attr("class", "x axis")
  .attr("transform", "translate(0," + this.height + ")")
  .call(this.xAxis)
  .append("text")
  .attr("class", "axis_label")
  .attr("y", +20)
  .attr("x", 0)
  .attr("dy", ".71em")
  .text(this.labelX);
}

BarChart.prototype.bindData = function(data, accessor_key, accessor_value){
  var self = this;

  this.drawAxes();

  var zero_height = function(d){
    var value = accessor_value(d);
    return self.height - self.y(value);

  };

  var zero_y = function(d){
    var value = accessor_value(d);
    return self.y(value);
  };


  this.drawStackItem(data, accessor_key, accessor_value, zero_y, zero_height);


}


function StackedBarChart(labelX, labelY, item_to_append){
  BarChart.call(this, labelX, labelY, item_to_append);
  this.type = "stacked";
}

StackedBarChart.prototype = Object.create(BarChart.prototype);



StackedBarChart.prototype.bindData = function(data, accessor_key, accessor_values){
  var self = this;
  this.drawAxes();


  var zero_height = function(d){
    var value = accessor_values.zero(d);
    return self.height - self.y(value);

  };

  var zero_y = function(d){
    var value = accessor_values.zero(d);
    return self.y(value);
  };


  this.drawStackItem(data, accessor_key, accessor_values.zero, zero_y, zero_height, "zero");

  var one_height = function(d){
    var value = accessor_values.one(d);
    return self.height - self.y(value);
    //return 20;
  }


  var one_y = function(d){

    var value = accessor_values.one(d);

    return  self.y(value) - zero_height(d);

  }

  this.drawStackItem(data, accessor_key, accessor_values.one, one_y , one_height ,"one");


  var two_height = function(d){
    var value = accessor_values.two(d);
    return self.height - self.y(value);
  };

  var two_y = function(d){
    var value = accessor_values.two(d);

    return  self.y(value) - one_height(d) - zero_height(d);
  }

  this.drawStackItem(data, accessor_key, accessor_values.two, two_y , two_height ,"two");

}
