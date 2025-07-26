import scrapy
from practice_project.items import categoryItem

class PracticeWonsilbotSpider(scrapy.Spider):
    name = "Practice_WonsilBot"
    allowed_domains = ["davelee-fun.github.io"]
    start_urls = ["https://davelee-fun.github.io"]

    def parse(self, response):
        item = categoryItem()
        categories = response.css("a.text-dark::text").getall()
        for category in categories :
            item["category"] = category
            yield item
        
