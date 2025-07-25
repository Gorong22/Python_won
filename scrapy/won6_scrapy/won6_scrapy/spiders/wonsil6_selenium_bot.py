import scrapy
from selenium import webdriver
from selenium.webdriver.common.by import By
import time


class Wonsil6SeleniumBotSpider(scrapy.Spider):
    name = "wonsil6_selenium_bot"
    allowed_domains = ["divjason.github.io"]
    start_urls = ["https://divjason.github.io/sellenium-test/"]

    def __init__(self) :
        headlessoptions = webdriver.ChromeOptions()
        headlessoptions.add_argument("headless")
        self.driver = webdriver.Chrome(options=headlessoptions)
        


    def parse(self, response):
        self.driver.get(response.url)
        time.sleep(2)
