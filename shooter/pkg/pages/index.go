package pages

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strconv"

	"github.com/labstack/echo/v4"
)

type Chart struct {
    Id int
    Title string
    Data []int
    Labels []string
    Stats *Stats
}

func newChart(id int, title string) *Chart {
    return &Chart {
        Id: id,
        Title: title,
        Data: make([]int, 0),
        Labels: make([]string, 0),
    }
}

func idxOf(labels []string, label string) int {
    for i, l := range labels {
        if l == label {
            return i
        }
    }

    return -1
}


func (c *Chart) addPoint(title string, value int, idx int) {
    for len(c.Data) <= idx {
        c.Data = append(c.Data, 0)
        c.Labels = append(c.Labels, "")
    }

    c.Data[idx] = c.Data[idx] + value
    c.Labels[idx] = title
}

func (c *Chart) addLine(line map[string]interface{}) {
    if title, ok := line["title"].(string); ok {
        if title != c.Title {
            return
        }
    } else {
        return
    }


    // iterate over property pointSet that is a map[string]int
    pointSet, ok := line["pointSet"].(map[string]interface{})
    if ok {
        for key, v := range pointSet {
            v64, ok := v.(float64)
            if !ok {
                continue
            }

            value := int(v64)
            idx := idxOf(c.Labels, key)

            if idx == -1 {
                c.Data = append(c.Data, value)
                c.Labels = append(c.Labels, key)
            } else {
                c.Data[idx] = c.Data[idx] + value
            }

        }
    }
}

func (c *Chart) sortLabels() {
    data := make([]int, len(c.Data))
    labels := make([]string, len(c.Labels))

    copy(labels, c.Labels)
    sort.Slice(labels, func(i, j int) bool {
        numA, _ := strconv.Atoi(labels[i])
        numB, _ := strconv.Atoi(labels[j])
        return numA < numB
    })

    for i := 0; i < len(labels); i++ {
        idx := idxOf(c.Labels, labels[i])
        if idx == -1 {
            panic("idx is -1")
        }

        data[i] = c.Data[idx]
    }

    c.Data = data
    c.Labels = labels
}

func (c *Chart) getTickTotal() int {
    total := 0
    for _, v := range c.Data {
        total += v
    }

    return total
}

type Stats struct {
    Q5 string
    Q10 string
    Q25 string
    Mean float64
    Median int
    Q75 string
    Q90 string
    Q95 string
}

func getSummedValueQuantileIdx(data []int, quantilePosition int) int {
    total := 0
    for i, v := range data {
        if quantilePosition > total && quantilePosition <= v + total {
            return i
        }

        total += v
    }

    return -1
}

func (c *Chart) CalculateStats() {
    total := c.getTickTotal()
    q5 := getSummedValueQuantileIdx(c.Data, int(float64(total) * 0.05))
    q10 := getSummedValueQuantileIdx(c.Data, int(float64(total) * 0.1))
    q25 := getSummedValueQuantileIdx(c.Data, int(float64(total) * 0.25))
    q75 := getSummedValueQuantileIdx(c.Data, int(float64(total) * 0.75))
    q90 := getSummedValueQuantileIdx(c.Data, int(float64(total) * 0.9))
    q95 := getSummedValueQuantileIdx(c.Data, int(float64(total) * 0.95))
    median := getSummedValueQuantileIdx(c.Data, int(float64(total) * 0.5))

    fmt.Printf("q10: %d, q25: %d, median: %d, q75: %d, q90: %d\n", q10, q25, median, q75, q90)

    sum := 0
    for i, v := range c.Data {
        lbl, _ := strconv.Atoi(c.Labels[i])
        sum += lbl * v
    }

    c.Stats = &Stats {
        Q5: c.Labels[q5],
        Q10: c.Labels[q10],
        Q25: c.Labels[q25],
        Mean: float64(sum) / float64(total),
        Median: median,
        Q75: c.Labels[q75],
        Q90: c.Labels[q90],
        Q95: c.Labels[q95],
    }
}

type Page struct {
    Charts []*Chart
    ErrorMsg string
    File string
    TotalTicks int
    Counters map[string]int
    Ratio float64
}

func Index(c echo.Context) error {
    file := c.QueryParam("file");

    c.Logger().Error("file: ", file)

    if file == "" {
        return c.Render(200, "index.html", nil)
    }

    // read file and parse line by line
    lines, err := os.ReadFile(file)
    c.Logger().Error("file error: ", err)
    if err != nil {
        c.Logger().Error("error: ", err.Error())
        return c.Render(200, "index.html", Page {
            Charts: nil,
            ErrorMsg: err.Error(),
            File: file,
        })
    }

    chartData := make(map[string]*Chart)
    chartTickClassify := newChart(0, "Tick Classification")
    titleIdx := map[string]int{
        "tickOnTime": 0,
        "tickIntervalOverrun": 1,
        "tickIntervalUnderrun": 2,
    }
    tickOnTime := 0;
    overUnderFlows := 0;
    counters := map[string]int{ }
    id := 1

    // for each over each line
    // its a byte array, therefore we need to split on new line

    for _, line := range bytes.Split(lines, []byte("\n")) {
        var parsed map[string]interface{}
        err := json.Unmarshal(line, &parsed)
        if err != nil {
            c.Logger().Error("couldn't json line", err)
            continue
        }

        title, ok := parsed["title"].(string)
        if !ok {
            continue
        }

        _, ok = parsed["pointSet"]
        if !ok {
            count := int(parsed["count"].(float64))
            if _, ok := titleIdx[title]; ok {
                if title == "tickOnTime" {
                    tickOnTime += count
                } else {
                    overUnderFlows += count
                }
                chartTickClassify.addPoint(title, int(parsed["count"].(float64)), titleIdx[title])
            } else {
                if _, ok := counters[title]; !ok {
                    counters[title] = 0
                }
                counters[title] += count
            }
            continue
        }

        chart, ok := chartData[title]
        if !ok {
            chart = newChart(id, title)
            chartData[title] = chart
        }

        id += 1
        chart.addLine(parsed)
    }

    charts := make([]*Chart, 0)
    charts = append(charts, chartTickClassify)

    totalTicks := 0
    for _, chart := range chartData {
        chart.sortLabels()
        chart.CalculateStats()
        totalTicks += chart.getTickTotal()
        charts = append(charts, chart)
    }
    c.Logger().Error("charts", len(charts))

    return c.Render(200, "index.html", Page {
        Ratio: float64(overUnderFlows) / (float64(overUnderFlows) + float64(tickOnTime)),
        ErrorMsg: "",
        Charts: charts,
        File: file,
        TotalTicks: totalTicks,
        Counters: counters,
    })
}

