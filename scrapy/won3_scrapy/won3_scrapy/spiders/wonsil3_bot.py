import scrapy
from won3_scrapy.items import Won3ScrapyItem


class Wonsil3BotSpider(scrapy.Spider):
    name = "wonsil3_bot"
    allowed_domains = ["davelee-fun.github.io"]
    start_urls = ["https://davelee-fun.github.io"]

    def parse(self, response):
        item = Won3ScrapyItem()
        categories = response.css("a.text-dark::text").getall()
        for category in categories :
            item["category"] = category.strip()
            yield item

      

        