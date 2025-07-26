import scrapy
from practice_wonsil2.items import PracticeWonsil2Item

class PwonsilBot2Spider(scrapy.Spider):
    name = "Pwonsil_bot2"
    allowed_domains = ["davelee-fun.github.io"]
    #start_urls = ["https://davelee-fun.github.io"]

    def start_requests(self):
        urls = ["https://davelee-fun.github.io"]
        urls.extend([f"https://davelee-fun.github.io/page{i}" for i in range(2,7)])

        for url in urls :
            yield scrapy.Request(url, self.parse)

    def parse(self, response):
        titles = response.css("h4.card-text::text").getall()
        for title in titles :
            item = PracticeWonsil2Item()
            item["title"] = title
            yield item
