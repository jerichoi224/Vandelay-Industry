import { Component, OnInit, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { ChartOptions, ChartType, ChartDataSets } from 'chart.js';
import { Label , SingleDataSet} from 'ng2-charts';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';

export interface DialogData {
  search_country: string;
  model_name: string[];
  model_count: number;
  company_name: string;
  company_count: number;
}

@Component({
  selector: 'app-data-display',
  templateUrl: './data-display.component.html',
  styleUrls: ['./data-display.component.sass']
})
export class DataDisplayComponent implements OnInit {
  title = 'Vandelay Industry';
  json_data: object[];
  url: string;
  msg: string;
  countries: Map<string, object[]> = new Map;
  countrySale: Map<string, number[]> = new Map;

  // All Countries Graph
  barChartType: ChartType = 'bar';
  barChartLegend = false;
  barChartPlugins = [];

  totalSalesOptions: ChartOptions;
  totalSalesData: ChartDataSets[];
  totalSalesLabel: Label[];

  avgSalesOptions: ChartOptions;
  avgSalesData: ChartDataSets[];
  avgSalesLabel: Label[];

  salesCountOptions: ChartOptions;
  salesCountData: ChartDataSets[];
  salesCountLabel: Label[];

  // Search Term Variables
  search_country: string;
  car_model: Map<string, number>;
  company: Map<string, number>;

  constructor(private httpService: HttpClient, public dialog: MatDialog, private toast: MatSnackBar){}

  ngOnInit(){
    this.url = 'https://my.api.mockaroo.com/vandelay_industries.json?key=1e872ee0';
    // this.query_data();
  }

  query_data(){
    this.httpService.get(this.url).subscribe(
        data => {
        this.json_data = data as object[];

        this.groupByCountry();
        this.getCountrySales();
        this.updateOverallGraphs();
      },
      (err:HttpErrorResponse) => {
        console.log(err.message);
        this.msg = "Unable to Load Data";
      }
    );
  }

  groupByCountry(){
    for(let entry of this.json_data){
      let country = entry["import_country"];
      if(country){
        if(!this.countries.has(country)){
          this.countries.set(country, [entry]);
        }
        else{
          this.countries.get(country).push(entry);
        }
      }
    }
  }

  getCountrySales(){
    for(let country of this.countries.keys()){
      let entries = this.countries.get(country);

      for(let entry of entries){
        if(!this.countrySale.has(country)){
          this.countrySale.set(country, [1, entry["sale_price"]]);
        }
        else{
          this.countrySale.get(country)[0]++;
          this.countrySale.get(country)[1] += entry["sale_price"];
        }
      }
    }
  }

  updateOverallGraphs(){
    const sortedBySales = new Map([...this.countrySale.entries()].sort((a, b) => b[1][1] - a[1][1]));
    this.totalSalesLabel = Array.from(sortedBySales.keys()).slice(0, 10);

    let totalSalesData = []

    for(let c of this.totalSalesLabel){
      totalSalesData.push(this.countrySale.get(c.toString())[1])
    }
    this.totalSalesData = [
      { data: totalSalesData, label: 'Sales Amount' }
    ];
    this.totalSalesOptions = {
      responsive: true,
      title: {
        display: true,
        text: 'Top 10 Total Sales Amount'
      }
    };

    const sortedByCount = new Map([...this.countrySale.entries()].sort((a, b) => b[1][0] - a[1][0]));
    this.salesCountLabel = Array.from(sortedByCount.keys()).slice(0, 10);

    let salesCountData = []

    for(let c of this.salesCountLabel){
      salesCountData.push(this.countrySale.get(c.toString())[0])
    }
    this.salesCountData = [
      { data: salesCountData, label: 'Sales Count' }
    ];
    this.salesCountOptions = {
      responsive: true,
      title: {
        display: true,
        text: 'Top 10 Sales Count'
      }
    };

    const sortedByAvg = new Map([...this.countrySale.entries()].sort((a, b) => (b[1][1]/b[1][0]) - (a[1][1]/a[1][0])));
    this.avgSalesLabel = Array.from(sortedByAvg.keys()).slice(0, 10);

    let avgSalesData = []

    for(let c of this.avgSalesLabel){
      let c_data = this.countrySale.get(c.toString())
      avgSalesData.push(c_data[1]/c_data[0])
    }
    this.avgSalesData = [
      { data: avgSalesData, label: 'Avg Sales'}
    ];
    this.avgSalesOptions = {
      responsive: true,
      title: {
        display: true,
        text: 'Top 10 Avg Sales '
      }
    };
  }

  countryNotFound() {
    this.toast.open("Country Not found. Please try again", "Dismiss", {
      duration: 2000,
    });
  }

  search(){
    if(this.search_country == null){
      return;
    }

    if(!this.countries.has(this.search_country)){
      this.countryNotFound();
      return;
    }

    this.car_model = new Map();
    this.company = new Map();
    for(let sale_data of this.countries.get(this.search_country)){
      let model = sale_data["model"];
      let comp = sale_data["make"];
      if(!this.car_model.has(model)){
        this.car_model.set(model, 1);
      }
      else{
        this.car_model.set(model, this.car_model.get(model) + 1)
      }

      if(!this.company.has(comp)){
        this.company.set(comp, 1);
      }
      else{
        this.company.set(comp, this.company.get(comp) + 1)
      }
    }

    const company_sorted = new Map([...this.company.entries()].sort((a, b) => b[1] - a[1]));
    const model_sorted = new Map([...this.car_model.entries()].sort((a, b) => b[1] - a[1]));

    console.log(company_sorted);
    console.log(model_sorted);

    const dialogRef = this.dialog.open(DetailPopup, {
      width: '1000px',
      data: {
        search_country: this.search_country,
        model_name: Array.from(model_sorted.keys())[0],
        model_count: Array.from(model_sorted.values())[0],
        company_name: Array.from(company_sorted.keys())[0],
        company_count: Array.from(company_sorted.values())[0]
      }
    });
  }

}

@Component({
  selector: 'detail-popup',
  templateUrl: 'detail-popup.html',
})
export class DetailPopup {

  constructor(
    public dialogRef: MatDialogRef<DetailPopup>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  close(): void {
    this.dialogRef.close();
  }
}
