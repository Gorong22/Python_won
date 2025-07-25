import scrapy
from won2_scrapy.items import Won2ScrapyItem


class Wonsil2BotSpider(scrapy.Spider):
    name = "wonsil2_bot"
    allowed_domains = ["davelee-fun.github.io"]
    start_urls = ["https://davelee-fun.github.io/"]

    def parse(self, response):
        item = Won2ScrapyItem()
        item["title"] = response.css("h1.sitetitle::text").get()
        description = response.xpath("//p[@class='lead']/text()").get()
        item["description"] = description
        yield item
